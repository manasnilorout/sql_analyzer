import { z } from 'genkit';

export interface LlmResponse {
    content: string;
    metadata?: Record<string, any>;
}

export interface LlmRequest {
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
}

export abstract class AbstractLlmImpl {
    protected constructor(
        protected readonly apiKey: string,
        protected readonly defaultModel: string,
        protected readonly defaultTemperature: number = 0.7,
        protected readonly defaultMaxTokens: number = 2000
    ) { }

    abstract sendMessageToLlm(request: LlmRequest): Promise<LlmResponse>;

    protected async convertResponseToJson<T>(response: LlmResponse, schema: z.ZodType<T>): Promise<T> {
        try {
            const parsed = JSON.parse(response.content);
            return schema.parse(parsed);
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                throw new Error(`Schema validation failed: ${error.message}`);
            }
            if (error instanceof Error) {
                throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
            }
            throw new Error('Failed to parse LLM response as JSON: Unknown error');
        }
    }

    protected validateRequest(request: LlmRequest): void {
        if (!request.prompt) {
            throw new Error('Prompt is required');
        }
    }

    protected getModel(request: LlmRequest): string {
        return request.model || this.defaultModel;
    }

    protected getTemperature(request: LlmRequest): number {
        return request.temperature ?? this.defaultTemperature;
    }

    protected getMaxTokens(request: LlmRequest): number {
        return request.maxTokens ?? this.defaultMaxTokens;
    }
} 