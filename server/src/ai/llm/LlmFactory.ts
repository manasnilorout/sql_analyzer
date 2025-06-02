import { AbstractLlmImpl } from './AbstractLlmImpl';
import { OpenAiImpl } from './OpenAiImpl';

export type LlmType = 'openai' | 'gemini';

export class LlmFactory {
    private static instances: Map<string, AbstractLlmImpl> = new Map();

    static getInstance(type: LlmType): AbstractLlmImpl {
        if (this.instances.has(type)) {
            return this.instances.get(type)!;
        }

        let instance: AbstractLlmImpl;

        switch (type) {
            case 'openai':
                const openaiKey = process.env.OPENAI_API_KEY;
                if (!openaiKey) {
                    throw new Error('OPENAI_API_KEY environment variable is not set');
                }
                instance = new OpenAiImpl(openaiKey);
                break;
            case 'gemini':
                // TODO: Implement Gemini implementation
                throw new Error('Gemini implementation not yet available');
            default:
                throw new Error(`Unsupported LLM type: ${type}`);
        }

        this.instances.set(type, instance);
        return instance;
    }

    static clearInstances(): void {
        this.instances.clear();
    }
} 