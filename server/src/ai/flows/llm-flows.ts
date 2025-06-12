import { LlmFactory, LlmType } from '../llm/LlmFactory'; // Ensure LlmType is imported
import { LlmRequest } from '../llm/AbstractLlmImpl';
import { z } from 'genkit';


// Common system prompts for different analysis types
const SYSTEM_PROMPTS = {
    summarizeCodeBlock: `You are an expert SQL analyst. Analyze the provided SQL code block and provide a structured summary. 
    Focus on the main purpose, key operations, data flow, and any important business logic. 
    Format your response as a JSON object with the following structure:
    {
        "mainPurpose": "string",
        "keyOperations": string[],
        "dataFlow": "string",
        "coreSqlConcepts": Array<{concept: string, explanation: string, codeExample?: string}>,
        "businessLogicInsights": string[],
        "beginnerFriendlyTips": string[]
    }`,

    explainLogicRules: `You are an expert SQL analyst. Provide a detailed explanation of the SQL code's logic and structure.
    Format your response as a JSON object with the following structure:
    {
        "chunkKeySummary": "string",
        "blockSummary": {
            "identifiedType": "string",
            "purpose": "string",
            "inputParameters": Array<{name: string, dataType: string, purpose: string}>,
            "functionReturnType": "string"
        },
        "proceduralControlFlow": Array<{stepNumber: number, statement: string, description: string}>,
        "targetObject": {name: string, targetType: string, writeOperation: string},
        "sourceTables": Array<{name: string, type: string, roleDescription: string}>,
        "joinAnalysis": {
            "joinsWithTargetTableExplanation": "string",
            "conditions": Array<{joinType: string, tablesInvolved: string, onCondition: string, purpose: string}>
        }
    }`,

    extractTableInfo: `You are an expert SQL analyst. Extract and analyze all table-related information from the SQL code.
    Format your response as a JSON object with the following structure:
    {
        "identifiedTables": Array<{
            "name": "string",
            "primaryRole": "Source" | "Target" | "SourceAndTarget" | "Mentioned",
            "roleDescription": "string",
            "operations": string[]
        }>
    }`,

    generateSqlLogicalFlow: `You are an expert SQL analyst. Break down the SQL code into logical steps for visualization.
    Format your response as a JSON object with the following structure:
    {
        "flowSteps": Array<{
            "id": "string",
            "title": "string",
            "description": "string",
            "sqlReference": "string"
        }>
    }`,

    summarizeEntireScript: `You are an expert SQL analyst. Provide a high-level summary of the entire SQL script.
    Format your response as a JSON object with the following structure:
    {
        "overallSummary": "string"
    }`
};

// Helper function to create LLM request
function createLlmRequest(
    prompt: string,
    systemPrompt: string,
    modelProvider: LlmType // Changed 'model' to 'modelProvider'
): LlmRequest {
    // This function might need more sophisticated logic if specific model names
    // are required for different providers beyond what LlmFactory sets as default.
    // For now, it sets a specific model name only if OpenAI is the provider,
    // otherwise, it relies on the default model configured for the provider in LlmFactory.
    return {
        prompt,
        systemPrompt,
        model: modelProvider === 'openai' ? 'gpt-4o' : undefined,
        temperature: 0.7, // These could also come from provider-specific defaults
        maxTokens: 2048  // or be part of the LlmRequest structure itself if more control is needed per call
    };
}

// Helper function to validate and parse LLM response
// Exporting this as it's used by AnalysisService
export async function validateAndParseResponse<T>(response: string, schema: z.ZodType<T>): Promise<T> {
    let processedResponse = response.trim();

    // Layer 1: Try specific ```json ... ```
    if (processedResponse.startsWith("```json") && processedResponse.endsWith("```")) {
        processedResponse = processedResponse.substring("```json".length, processedResponse.length - "```".length).trim();
    }
    // Layer 2: Try generic ``` ... ``` (applied to the result of Layer 1 or original trimmed string)
    // This will catch cases where Layer 1 might have been too specific or if only generic fences were used.
    if (processedResponse.startsWith("```") && processedResponse.endsWith("```")) {
        processedResponse = processedResponse.substring("```".length, processedResponse.length - "```".length).trim();
    }

    // Layer 3: A more forgiving regex as a final attempt.
    // This regex tries to find content between the *first* instance of ```json or ``` and the *last* instance of ```.
    // This is applied to the original trimmed response to ensure it can catch partial stripping from layers 1 & 2.
    const looksLikeJson = (str: string) => (str.startsWith("{") && str.endsWith("}")) || (str.startsWith("[") && str.endsWith("]"));

    if (!looksLikeJson(processedResponse)) {
        const originalTrimmedResponse = response.trim();
        // Regex to find content between optional json specifier and markdown fences
        // It captures content between the first occurrence of ``` (optionally followed by 'json') and the last ```
        const forgivingRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
        const forgivingMatch = originalTrimmedResponse.match(forgivingRegex);

        if (forgivingMatch && forgivingMatch[1]) {
            const regexCleanedResponse = forgivingMatch[1].trim();
            // Prefer regex result if it looks more like JSON than what simple stripping produced,
            // or if simple stripping produced something that doesn't look like JSON.
            if (looksLikeJson(regexCleanedResponse) || !looksLikeJson(processedResponse)) {
                 processedResponse = regexCleanedResponse;
            }
        }
    }

    try {
        const parsed = JSON.parse(processedResponse);
        return schema.parse(parsed);
    } catch (error) {
        // Add more context to the error message if parsing failed after cleaning
        const originalContentForError = response.length > 100 ? response.substring(0, 100) + "..." : response;
        const processedContentForError = processedResponse.length > 100 ? processedResponse.substring(0, 100) + "..." : processedResponse;

        if (error instanceof z.ZodError) {
            throw new Error(`Schema validation failed after cleaning response. Error: ${error.message}. Original snippet: "${originalContentForError}". Processed snippet: "${processedContentForError}"`);
        }
        throw new Error(`Failed to parse LLM response as JSON after cleaning. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Original snippet: "${originalContentForError}". Processed snippet: "${processedContentForError}"`);
    }
}

// Export functions that use the LLM factory
export async function analyzeWithLlm<T>(
    prompt: string,
    systemPrompt: string,
    modelProvider: LlmType, // Changed 'model' to 'modelProvider' to reflect it's a LlmType
    schema: z.ZodType<T>
): Promise<T> {
    const llm = LlmFactory.getInstance(modelProvider);
    // createLlmRequest now correctly takes modelProvider
    const request = createLlmRequest(prompt, systemPrompt, modelProvider);
    const response = await llm.sendMessageToLlm(request);
    return validateAndParseResponse(response.content, schema);
}

// Export the system prompts for use in other files
export { SYSTEM_PROMPTS };
// validateAndParseResponse is already exported above due to its usage in AnalysisService