import { AbstractLlmImpl, LlmRequest, LlmResponse } from './AbstractLlmImpl';
import { VertexAI, Part } from '@google-cloud/aiplatform';
import { logger } from '../../utils/logger'; // Assuming a logger utility

// Default values for Vertex AI, can be overridden by LlmFactory
const VERTEXAI_DEFAULT_MODEL = 'gemini-1.5-flash-001'; // Example, use an appropriate model
const VERTEXAI_DEFAULT_TEMPERATURE = 0.7;
const VERTEXAI_DEFAULT_MAX_TOKENS = 2048;

export class VertexAiLlmImpl extends AbstractLlmImpl {
    private readonly vertexAIClient: VertexAI;
    private readonly projectId: string;
    private readonly location: string;

    constructor(
        projectId: string,
        location: string,
        // Pass a placeholder for apiKey as it's not directly used by Vertex AI ADC
        apiKeyPlaceholder: string = "vertex_adc_auth",
        defaultModel: string = VERTEXAI_DEFAULT_MODEL,
        defaultTemperature: number = VERTEXAI_DEFAULT_TEMPERATURE,
        defaultMaxTokens: number = VERTEXAI_DEFAULT_MAX_TOKENS
    ) {
        super(apiKeyPlaceholder, defaultModel, defaultTemperature, defaultMaxTokens);

        if (!projectId) {
            throw new Error('Vertex AI Project ID is required.');
        }
        if (!location) {
            throw new Error('Vertex AI Location is required.');
        }
        this.projectId = projectId;
        this.location = location;

        this.vertexAIClient = new VertexAI({ project: this.projectId, location: this.location });
    }

    async sendMessageToLlm(request: LlmRequest): Promise<LlmResponse> {
        this.validateRequest(request); // Use parent class validation

        const modelId = this.getModel(request);
        const temperature = this.getTemperature(request);
        const maxOutputTokens = this.getMaxTokens(request); // Renamed for clarity with Vertex AI terminology

        const generativeModel = this.vertexAIClient.getGenerativeModel({
            model: modelId,
            // generationConfig and safetySettings can also be set here if needed globally
        });

        const contents: Part[] = [];
        // Vertex AI Gemini API typically structures system prompts as the first part of a multi-turn chat,
        // or within the initial user message if it's a single turn.
        // For simplicity here, if a system prompt exists, we prepend it to the user's prompt.
        // More sophisticated handling might involve specific 'system' role if the model/API version supports it directly in 'contents'.
        let combinedPrompt = request.prompt;
        if (request.systemPrompt) {
            // Option 1: Prepend to user prompt (common for some Gemini versions/uses)
            combinedPrompt = `${request.systemPrompt}\n\nUser Prompt:\n${request.prompt}`;
            // Option 2: If the model supports a "system" role in contents (less common for direct predict, more for chat)
            // contents.push({ role: 'system', parts: [{ text: request.systemPrompt }] });
            // contents.push({ role: 'user', parts: [{ text: request.prompt }] });
            // For now, using combined prompt.
        }
        contents.push({text: combinedPrompt});


        logger.info(`Sending request to Vertex AI Gemini model: ${modelId} in ${this.location}`);
        // logger.debug('Vertex AI Request Contents:', contents); // Be cautious logging full prompts

        const apiTimeoutMs = process.env.LLM_API_TIMEOUT_MS
            ? parseInt(process.env.LLM_API_TIMEOUT_MS, 10)
            : 120000; // Default to 120 seconds

        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Vertex AI API call timed out after ${apiTimeoutMs}ms`));
            }, apiTimeoutMs);
        });

        try {
            // Note: The Vertex AI SDK's generateContent might not directly accept an AbortSignal
            // in its GenerateContentRequest for all transport layers or model types easily.
            // Promise.race is a reliable way to enforce timeout.
            const generateContentPromise = generativeModel.generateContent({
                contents: [{ role: 'user', parts: contents }], // Gemini API expects contents with roles.
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: maxOutputTokens,
                },
            });

            const result = await Promise.race([generateContentPromise, timeoutPromise]);
            if (timeoutId) clearTimeout(timeoutId);

            const response = result.response;
            // logger.debug('Vertex AI Response:', JSON.stringify(response, null, 2));


            if (!response || !response.candidates || response.candidates.length === 0) {
                logger.error('Invalid response structure from Vertex AI (no candidates):', response);
                throw new Error('Invalid response structure from Vertex AI: No candidates found.');
            }

            const candidate = response.candidates[0];
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0 || !candidate.content.parts[0].text) {
                // Check for blocked content due to safety filters
                if (candidate.finishReason === 'SAFETY') {
                    const safetyRatings = candidate.safetyRatings?.map(r => `${r.category} was ${r.probability}`).join(', ') || 'No specific ratings.';
                    logger.warn(`Vertex AI content generation blocked due to safety reasons: ${safetyRatings}`, response);
                    throw new Error(`Content generation blocked by Vertex AI due to safety filters: ${safetyRatings}.`);
                }
                logger.error('Invalid response structure from Vertex AI (no text part):', response);
                throw new Error('Invalid response structure from Vertex AI: No text content found in the first candidate.');
            }

            const content = candidate.content.parts[0].text;

            // Extract usage metadata if available (structure might vary slightly)
            const usageMetadata = response.usageMetadata || candidate.tokenCount; // candidate.tokenCount is simpler if available

            return {
                content: content.trim(),
                metadata: {
                    model: modelId, // The model used
                    finishReason: candidate.finishReason,
                    safetyRatings: candidate.safetyRatings,
                    tokenCount: usageMetadata, // Contains promptTokenCount, candidatesTokenCount, totalTokenCount
                },
            };

        } catch (error: any) {
            logger.error('Error calling Vertex AI API:', error);
            if (error.message.includes("safety filters")) { // From our own error handling
                 throw error;
            }
            // Check for specific gRPC error codes or known Vertex AI error patterns if possible
            // For example, permission denied, quota exceeded, etc.
            // error.details might contain more info for gRPC errors.
            if (timeoutId) clearTimeout(timeoutId);
            throw new Error(`Failed to communicate with Vertex AI API: ${error.message || 'Unknown error'}`);
        }
    }
}
