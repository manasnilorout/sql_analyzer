import OpenAI from 'openai';
import { AbstractLlmImpl, LlmRequest, LlmResponse } from './AbstractLlmImpl';

export class OpenAiImpl extends AbstractLlmImpl {
    private readonly client: OpenAI;

    constructor(
        apiKey: string,
        defaultModel: string = 'gpt-4o', // Changed default model to gpt-4o
        defaultTemperature: number = 0.7,
        defaultMaxTokens: number = 2048 // Standardized default max tokens
    ) {
        super(apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
        if (!apiKey) { // Added explicit API key check for clarity, though OpenAI client would also fail
            throw new Error('OpenAI API key is required for OpenAiImpl.');
        }
        this.client = new OpenAI({ apiKey });
    }

    async sendMessageToLlm(request: LlmRequest): Promise<LlmResponse> {
        this.validateRequest(request);

        const apiTimeoutMs = process.env.LLM_API_TIMEOUT_MS
            ? parseInt(process.env.LLM_API_TIMEOUT_MS, 10)
            : 120000; // Default to 120 seconds

        try {
            const response = await this.client.chat.completions.create({
                model: this.getModel(request),
                messages: [
                    ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
                    { role: 'user' as const, content: request.prompt }
                ],
                temperature: this.getTemperature(request),
                max_tokens: this.getMaxTokens(request),
                response_format: { type: 'json_object' }
            }, {
                timeout: apiTimeoutMs,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content in OpenAI response');
            }

            return {
                content,
                metadata: {
                    model: response.model,
                    usage: response.usage,
                    finish_reason: response.choices[0]?.finish_reason
                }
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`OpenAI API error: ${error.message}`);
            }
            throw new Error('Unknown error occurred while calling OpenAI API');
        }
    }
} 