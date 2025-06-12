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
    }
    IMPORTANT: Ensure the entire output is a single, valid JSON object. Double-check all JSON syntax, especially for correct placement of commas within objects and arrays, and ensure all brackets \`[]\` and braces \`{}\` are correctly opened and closed. All string values must be properly escaped where necessary.`,

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
            "sqlReference": "string",
            "type": "string" // One of "'DataRetrieval' | 'Filtering' | 'Joining' | 'Transformation' | 'Aggregation' | 'Sorting' | 'Modification' | 'CTEInitialization' | 'CTEConsumption' | 'SubqueryExecution' | 'SetOperation' | 'WindowFunction' | 'ConditionalLogic' | 'VariableAssignment' | 'Output' | 'Other'"
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
import { createLogger } from '../../utils/logger';
const logger = createLogger();

// Exporting this as it's used by AnalysisService
export async function validateAndParseResponse<T>(response: string, schema: z.ZodType<T>): Promise<T> {
    // Detailed Initial Logging
    // Using console.log for direct visibility as logger might not be configured for debug in all environments
    console.log("Original response for parsing (first 30 chars with codes):");
    for (let i = 0; i < Math.min(response.length, 30); i++) {
        console.log(`'${response[i]}' (Code: ${response.charCodeAt(i)})`);
    }
    if (response.length > 30) console.log("...");

    let processedResponse = response; // Start with the raw response for brace/bracket finding

    const firstBrace = processedResponse.indexOf('{');
    const lastBrace = processedResponse.lastIndexOf('}');
    const firstBracket = processedResponse.indexOf('[');
    const lastBracket = processedResponse.lastIndexOf(']');

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        // Potential JSON object found
        // Check if this object is likely the primary content vs. an array of objects
        if (firstBracket === -1 || (firstBracket !== -1 && firstBrace < firstBracket)) {
            // '{...}' is likely the main structure
            processedResponse = processedResponse.substring(firstBrace, lastBrace + 1);
        } else if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < firstBrace) {
            // '[...{...}...]'. This is an array containing objects.
            // The initial brace/bracket logic might be too simple for this.
            // Let's try to grab the array if it seems to be the outermost structure.
             processedResponse = processedResponse.substring(firstBracket, lastBracket + 1);
        }
        // If both are present and it's unclear, the fallback regex might be better.
        // For now, this prioritizes object if it starts first, then array if it starts first.

    } else if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
        // Potential JSON array found, and no object was found or object was nested
        processedResponse = processedResponse.substring(firstBracket, lastBracket + 1);
    } else {
        // Fallback: if no clear JSON object/array structure is found by braces/brackets,
        // or if the above logic was insufficient (e.g. array of objects starting with '[' before first '{')
        // use the regex approach on the original trimmed string.
        let trimmedOriginal = response.trim();
        const markdownJsonRegex = new RegExp(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/, "i");
        const match = trimmedOriginal.match(markdownJsonRegex);
        if (match && match[1]) {
            processedResponse = match[1].trim();
        } else if (trimmedOriginal.startsWith("```") && trimmedOriginal.endsWith("```")) {
            // Fallback if regex fails but basic fences are there
            processedResponse = trimmedOriginal.substring(3, trimmedOriginal.length - 3).trim();
        } else {
            // If nothing else worked, use the (already initialized) trimmed original string and hope for the best
            processedResponse = trimmedOriginal; // Ensure it's at least trimmed
        }
    }

    // Ensure the result of aggressive stripping is trimmed one last time.
    processedResponse = processedResponse.trim();

    // console.log("Attempting to parse JSON from aggressively cleaned string (first 500 chars):", processedResponse.substring(0, 500));
    // if(processedResponse.length === 0) {
    //     logger.error("Processed response is empty after stripping. Original response (first 100 chars): " + response.substring(0,100) + "...");
    //     throw new Error("Processed response is empty after stripping attempts. Cannot parse empty string as JSON.");
    // }


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