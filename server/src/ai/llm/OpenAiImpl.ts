import OpenAI from 'openai';
import { AbstractLlmImpl, LlmRequest, LlmResponse } from './AbstractLlmImpl';

export class OpenAiImpl extends AbstractLlmImpl {
    private readonly client: OpenAI;

    constructor(
        apiKey: string,
        defaultModel: string = 'gpt-4-turbo-preview',
        defaultTemperature: number = 0.7,
        defaultMaxTokens: number = 2000
    ) {
        super(apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
        this.client = new OpenAI({ apiKey });
    }

    async sendMessageToLlm(request: LlmRequest): Promise<LlmResponse> {
        this.validateRequest(request);

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