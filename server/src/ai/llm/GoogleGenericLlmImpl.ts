import { AbstractLlmImpl, LlmRequest, LlmResponse } from './AbstractLlmImpl';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Content } from '@google/generative-ai';
import { createLogger } from '../../utils/logger';
const logger = createLogger();

// Default values for Google AI (Gemini via SDK)
const GOOGLE_GENAI_DEFAULT_MODEL = 'gemini-1.5-flash-latest'; // Or 'gemini-pro' etc.
const GOOGLE_GENAI_DEFAULT_TEMPERATURE = 0.7;
const GOOGLE_GENAI_DEFAULT_MAX_TOKENS = 2048;

export class GoogleGenericLlmImpl extends AbstractLlmImpl {
    private readonly googleAiSdk: GoogleGenerativeAI;

    constructor(
        apiKey: string,
        defaultModel: string = GOOGLE_GENAI_DEFAULT_MODEL,
        defaultTemperature: number = GOOGLE_GENAI_DEFAULT_TEMPERATURE,
        defaultMaxTokens: number = GOOGLE_GENAI_DEFAULT_MAX_TOKENS
    ) {
        super(apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
        if (!apiKey) {
            throw new Error('Google GenAI API key is required for GoogleGenericLlmImpl.');
        }
        this.googleAiSdk = new GoogleGenerativeAI(apiKey);
    }

    async sendMessageToLlm(request: LlmRequest): Promise<LlmResponse> {
        this.validateRequest(request);

        const modelName = this.getModel(request);
        const temperature = this.getTemperature(request);
        const maxOutputTokens = this.getMaxTokens(request);

        const generationConfig: GenerationConfig = {
            temperature: temperature,
            maxOutputTokens: maxOutputTokens,
            // topK, topP can also be added here if needed
        };

        // System instructions are best handled at the model initialization for some Gemini versions/SDK features
        // or as part of the initial message construction.
        const modelInstance = this.googleAiSdk.getGenerativeModel({
             model: modelName,
             // systemInstruction allows setting a system prompt directly at model level
             // This is preferred over prepending to user prompt if available and suitable.
             ...(request.systemPrompt && { systemInstruction: { role: "system", parts: [{text: request.systemPrompt}] } }),
             // Basic safety settings - adjust as needed
             safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        });


        // The content for generateContent should be an array of Content objects for chat history,
        // or a simple string for single-turn.
        // For now, assuming a single user prompt, potentially augmented by a system prompt.
        // If systemInstruction is used above, just the user prompt is needed.
        // If systemInstruction is not used, the system prompt should be prepended.
        // The current LlmRequest structure doesn't distinguish chat history.

        // For non-chat models or simpler `generateContent(promptString)`:
        // let fullPrompt = request.prompt;
        // if (request.systemPrompt && !modelInstance.systemInstruction) { // Check if systemInstruction was applied
        // fullPrompt = `${request.systemPrompt}\n\n${request.prompt}`;
        // }
        // const contents: Content[] = [{ role: "user", parts: [{text: fullPrompt}]}];

        // Using the structure that assumes systemInstruction is handled by the model if provided
        const contentsForRequest: Content[] = [{ role: "user", parts: [{text: request.prompt}]}];


        logger.info(`Sending request to Google AI Gemini model: ${modelName}`);
        // logger.debug('Google AI Request Contents:', contentsForRequest); // Be cautious

        const apiTimeoutMs = process.env.LLM_API_TIMEOUT_MS
            ? parseInt(process.env.LLM_API_TIMEOUT_MS, 10)
            : 120000; // Default to 120 seconds

        // The `generateContent` method in @google/generative-ai SDK can accept RequestOptions with a timeout.
        // However, the specific structure for passing it might be part of a general options bag
        // or directly on the call. Let's assume it's part of an options object for generateContent.
        // If not directly supported, Promise.race with AbortController would be the alternative.
        // Based on common patterns for this SDK, a direct timeout option is often available.
        // Rechecking documentation: The 'generateContent' method itself doesn't list a direct timeout in its GenerateContentRequest.
        // It's typically handled by the client configuration or higher-level request options not directly in generateContent's arguments.
        // Let's use Promise.race for robust timeout handling here if direct method timeout isn't available.
        // UPDATE: The SDK's `getGenerativeModel` takes `RequestOptions` which can include `timeout`.
        // This timeout applies to requests made with that model instance.

        // Re-correction: It's better to apply timeout per request if possible.
        // The `generateContent` method itself can take a `RequestOptions` argument, which includes `timeout`.
        // This is not well-documented in all places but is a feature of the underlying client.
        // Let's try to pass it there. If not, `Promise.race` is the fallback.
        // For this SDK, it's usually part of the client config or a specific request option.
        // The `generateContent` method itself doesn't take `RequestOptions`.
        // It's `GoogleGenerativeAI.getGenerativeModel(modelRequest: ModelParams, requestOptions?: RequestOptions)`
        // So, we should set it when getting the model instance if we want to use the SDK's built-in timeout.
        // However, this would mean the timeout is fixed when the model instance is created.
        // For per-request timeout, Promise.race is more reliable if the generateContent method itself lacks a timeout option.

        // Let's use Promise.race for explicit per-request timeout control.
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Google AI API call timed out after ${apiTimeoutMs}ms`));
            }, apiTimeoutMs);
        });

        try {
            const generateContentPromise = modelInstance.generateContent({
                contents: contentsForRequest,
                generationConfig: generationConfig,
            });

            const result = await Promise.race([generateContentPromise, timeoutPromise]);
            if (timeoutId) clearTimeout(timeoutId);

            const response = result.response;
            // logger.debug('Google AI Response:', JSON.stringify(response, null, 2));

            if (!response) {
                logger.error('Invalid response structure from Google AI (no response object):', result);
                throw new Error('Invalid response structure from Google AI: No response object found.');
            }

            // Check for blocked content due to safety filters or other reasons
            if (!response.candidates || response.candidates.length === 0 || response.candidates[0].finishReason === 'SAFETY' || response.candidates[0].finishReason === 'RECITATION' || response.candidates[0].finishReason === 'OTHER') {
                 const reason = response.candidates?.[0]?.finishReason || 'No candidates in response';
                 const safetyRatings = response.promptFeedback?.safetyRatings?.map(r => `${r.category} was ${r.probability}`).join(', ') || 'No specific ratings.';
                 logger.warn(`Google AI content generation potentially problematic. Finish Reason: ${reason}. Safety: ${safetyRatings}`, response);
                 if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                    throw new Error(`Content generation blocked by Google AI due to safety filters: ${safetyRatings}. Finish Reason: ${reason}.`);
                 }
                 // For other reasons, we might still try to get text if available, or throw.
                 // If there's no text part, it's an issue.
                 if (!response.text) { // .text() is a helper on the response object itself.
                    throw new Error(`Content generation stopped. Finish Reason: ${reason}. Safety: ${safetyRatings}. No text available.`);
                 }
            }

            const textContent = response.text(); // Helper to get full text
            if (textContent === undefined || textContent === null) {
                 logger.error('Invalid response structure from Google AI (no text content):', response);
                throw new Error('Invalid response structure from Google AI: No text content found.');
            }

            return {
                content: textContent.trim(),
                metadata: {
                    model: modelName,
                    finishReason: response.candidates?.[0]?.finishReason,
                    safetyRatings: response.promptFeedback?.safetyRatings,
                    // Access usageMetadata from the main response object for token counts
                    promptTokenCount: response.usageMetadata?.promptTokenCount,
                    candidatesTokenCount: response.usageMetadata?.candidatesTokenCount,
                    totalTokenCount: response.usageMetadata?.totalTokenCount,
                },
            };

        } catch (error: any) {
            logger.error('Error calling Google AI API:', error);
             if (error.message.includes("safety filters") || error.message.includes("Content generation stopped")) {
                 throw error;
            }
            // The @google/generative-ai SDK might throw specific error types.
            // e.g., if (error instanceof GoogleGenerativeAIError) { ... }
            if (timeoutId) clearTimeout(timeoutId); // Clear timeout if error occurs before timeout
            throw new Error(`Failed to communicate with Google AI API: ${error.message || 'Unknown error'}`);
        }
    }
}
