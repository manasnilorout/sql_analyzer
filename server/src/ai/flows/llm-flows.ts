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
    try {
        const parsed = JSON.parse(response);
        return schema.parse(parsed);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Schema validation failed: ${error.message}`);
        }
        throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
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