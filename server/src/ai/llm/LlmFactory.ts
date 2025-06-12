import { AbstractLlmImpl } from './AbstractLlmImpl';
import { OpenAiImpl } from './OpenAiImpl';
import { VertexAiLlmImpl } from './VertexAiLlmImpl';
import { GoogleGenericLlmImpl } from './GoogleGenericLlmImpl'; // Import GoogleGenericLlmImpl

export type LlmType = 'openai' | 'gemini' | 'vertexai' | 'google-generic'; // Added 'google-generic'

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
                    throw new Error('OPENAI_API_KEY environment variable is not set. This is required for using OpenAI models.');
                }
                const defaultOpenAiModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
                const defaultOpenAiTemperature = process.env.OPENAI_DEFAULT_TEMPERATURE ? parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE) : 0.7;
                const defaultOpenAiMaxTokens = process.env.OPENAI_DEFAULT_MAX_TOKENS ? parseInt(process.env.OPENAI_DEFAULT_MAX_TOKENS, 10) : 2048;

                instance = new OpenAiImpl(
                    openaiKey,
                    defaultOpenAiModel,
                    defaultOpenAiTemperature,
                    defaultOpenAiMaxTokens
                );
                break;
            case 'vertexai':
                const projectId = process.env.VERTEXAI_PROJECT_ID;
                const location = process.env.VERTEXAI_LOCATION;

                if (!projectId) {
                    throw new Error('VERTEXAI_PROJECT_ID environment variable is not set. This is required for Vertex AI.');
                }
                if (!location) {
                    throw new Error('VERTEXAI_LOCATION environment variable is not set. This is required for Vertex AI.');
                }

                const defaultVertexModel = process.env.VERTEXAI_DEFAULT_MODEL || 'gemini-1.5-flash-001';
                const defaultVertexTemperature = process.env.VERTEXAI_DEFAULT_TEMPERATURE ? parseFloat(process.env.VERTEXAI_DEFAULT_TEMPERATURE) : 0.7;
                const defaultVertexMaxTokens = process.env.VERTEXAI_DEFAULT_MAX_TOKENS ? parseInt(process.env.VERTEXAI_DEFAULT_MAX_TOKENS, 10) : 2048;

                instance = new VertexAiLlmImpl(
                    projectId,
                    location,
                    "vertex_adc_auth", // Placeholder for apiKey as per VertexAiLlmImpl constructor
                    defaultVertexModel,
                    defaultVertexTemperature,
                    defaultVertexMaxTokens
                );
                break;
            case 'google-generic':
                const googleGenAiKey = process.env.GOOGLE_GENAI_API_KEY;
                if (!googleGenAiKey) {
                    throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set. This is required for Google Generic AI models.');
                }
                const defaultGoogleGenAiModel = process.env.GOOGLE_GENAI_DEFAULT_MODEL || 'gemini-1.5-flash-latest';
                const defaultGoogleGenAiTemperature = process.env.GOOGLE_GENAI_DEFAULT_TEMPERATURE ? parseFloat(process.env.GOOGLE_GENAI_DEFAULT_TEMPERATURE) : 0.7;
                const defaultGoogleGenAiMaxTokens = process.env.GOOGLE_GENAI_DEFAULT_MAX_TOKENS ? parseInt(process.env.GOOGLE_GENAI_DEFAULT_MAX_TOKENS, 10) : 2048;

                instance = new GoogleGenericLlmImpl(
                    googleGenAiKey,
                    defaultGoogleGenAiModel,
                    defaultGoogleGenAiTemperature,
                    defaultGoogleGenAiMaxTokens
                );
                break;
            case 'gemini':
                // This case was originally for a potential direct Gemini (non-Vertex, non-Genkit) implementation.
                // It's now superseded by 'google-generic' for direct SDK usage of Gemini models.
                // If Genkit's Gemini is still desired via factory, it would need its own LlmImpl adapter.
                throw new Error("'gemini' provider type is ambiguous. Use 'google-generic' for Google AI SDK Gemini or 'vertexai' for Vertex AI Gemini.");
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