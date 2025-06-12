import type { FullAnalysisPayload, AnalysisError, SingleAnalysisResult, SharedSecondLevelPartition } from "@shared/types/analysis";
import { BlockType } from "@shared/types/analysis";
import { z } from 'genkit'; // Genkit's z import might still be used by schemas, or can be replaced by 'zod'
import { LlmFactory, LlmType } from '../ai/llm/LlmFactory'; // Import LlmType
import { AbstractLlmImpl, LlmRequest, LlmResponse } from '../ai/llm/AbstractLlmImpl';
import { SYSTEM_PROMPTS, validateAndParseResponse, analyzeWithLlm } from '../ai/flows/llm-flows'; // Added analyzeWithLlm
import { createLogger } from '../utils/logger'; // Corrected path
import { EnhancedSqlParser, BlockParsingContext } from './EnhancedSqlParser';
const logger = createLogger();

// Import Zod Schemas and TypeScript types for outputs from their original flow files
import { SummarizeCodeBlockOutputSchema, type SummarizeCodeBlockOutput } from '../ai/flows/summarize-code-block';
import { ExplainSqlBlockOutputSchema, type ExplainSqlBlockOutput } from '../ai/flows/explain-logic-rules';
import { ExtractTableInfoOutputSchema, type ExtractTableInfoOutput } from '../ai/flows/extract-table-info';
import { GenerateSqlLogicalFlowOutputSchema, type GenerateSqlLogicalFlowOutput } from '../ai/flows/generate-sql-logical-flow';
import { SummarizeEntireScriptOutputSchema, type SummarizeEntireScriptOutput } from '../ai/flows/summarize-entire-script';

// This interface seems unused now, can be removed if analyzeWithLlm method is also removed or refactored
// interface AnalysisResult {
//   codeBlockAnalysis: any;
//   logicRulesAnalysis: any;
//   tableInfoAnalysis: any;
//   logicalFlowAnalysis: any;
//   scriptSummary: any;
// }

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 1500;

export class AnalysisService {
  // llmInstance is no longer a class member initialized in constructor
  private readonly retryMaxRetries: number;
  private readonly retryInitialDelayMs: number;
  private readonly enhancedParser: EnhancedSqlParser;

  constructor() {
    // Constructor can be used for other initializations if needed
    this.retryMaxRetries = DEFAULT_MAX_RETRIES;
    this.retryInitialDelayMs = DEFAULT_INITIAL_DELAY_MS;
    this.enhancedParser = new EnhancedSqlParser();
  }

  private async invokeLlmWithRetry<TRequest extends LlmRequest>(
    llm: AbstractLlmImpl, // LLM instance is now passed as a parameter
    request: TRequest,
    maxRetries: number,
    initialDelayMs: number
  ): Promise<LlmResponse> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        // Call sendMessageToLlm on the passed llm instance
        return await llm.sendMessageToLlm(request);
      } catch (error: any) {
        logger.warn(`LLM call with ${llm.constructor.name} attempt ${attempt + 1} failed. Error: ${error.message}`);
        if (attempt === maxRetries) {
          logger.error(`LLM call failed after ${maxRetries + 1} attempts.`);
          throw error; // Re-throw the error if max retries are reached
        }

        // Check for 429 or rate limit related messages
        // This check might need refinement based on actual error objects from different LLM providers
        const errorMessage = String(error.message).toLowerCase();
        if (errorMessage.includes('429') || errorMessage.includes('too many requests') || errorMessage.includes('rate limit') || errorMessage.includes('resource has been exhausted')) {
          const delay = initialDelayMs * Math.pow(2, attempt);
          const jitter = delay * 0.1 * Math.random(); // Add jitter up to 10%
          const delayWithJitter = Math.round(delay + jitter);

          logger.info(`Rate limit error detected. Retrying in ${delayWithJitter}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayWithJitter));
        } else {
          // For non-retryable errors, re-throw immediately
          logger.error('Non-retryable LLM error:', error);
          throw error;
        }
      }
      attempt++;
    }
    // Should not be reached if maxRetries is handled correctly in the loop
    throw new Error('LLM call failed after exhausting retries (unexpectedly reached end of retry logic).');
  }


  /**
   * Utility to split SQL script into chunks
   * @deprecated Use partitionSqlScriptV1 for more advanced partitioning.
   */
  private chunkSqlScript(sqlCode: string): string[] {
    const trimmedSql = sqlCode.trim();
    if (!trimmedSql) {
      return [];
    }

    const goSplitRegex = /^\s*GO\s*$/im; // GO must be on its own line, case-insensitive, multiline
    const containsGo = goSplitRegex.test(trimmedSql);

    if (containsGo) {
      const chunks = trimmedSql
        .split(goSplitRegex)
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);
      // If the script was only "GO" or multiple "GO"s, chunks will be empty.
      // If it was "SELECT 1 GO", chunks will be ["SELECT 1"].
      // If it was just "SELECT 1" (no GO), it wouldn't hit this block.
      // This check ensures that if the script is *only* GO statements, it returns empty,
      // otherwise if there's content besides GO, it returns that content.
      return chunks.length > 0 ? chunks : (trimmedSql.match(/^(\s*GO\s*)+$/) ? [] : [trimmedSql]);
    } else {
      // Fallback to semicolon splitting if GO is not found
      const chunks = trimmedSql
        .split(';')
        .map(chunk => {
          const trimmedChunk = chunk.trim();
          // Preserve semicolon if it's part of the statement (e.g. within a string literal)
          // This is a simplified approach; proper parsing would be needed for complex cases.
          return trimmedChunk;
        })
        .filter(chunk => chunk.length > 0);

      // If, after splitting by semicolon, no chunks are found but the original script had content,
      // it means the script was a single statement without a trailing semicolon.
      if (chunks.length === 0 && trimmedSql.length > 0) {
        return [trimmedSql]; // Treat as single chunk
      }
      return chunks;
    }
  }

  private partitionSqlScriptV1(sqlCode: string): string[] {
    // 1. Handle Comments (Strip them for now)
    // Remove block comments /* ... */
    let code = sqlCode.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove line comments -- ...
    code = code.replace(/--.*?(\r\n|\r|\n|$)/g, '$1'); // Keep the newline character

    const partitions: string[] = [];
    // 2. GO Separator: Split the script by `GO` (case-insensitive, on its own line)
    const goSegments = code.split(/^\s*GO\s*$/im);

    const topLevelKeywordsRegex = new RegExp(
      `^\\s*(CREATE\\s+(OR\\s+ALTER\\s+)?(PROCEDURE|FUNCTION|VIEW|TABLE|INDEX|TRIGGER)|ALTER\\s+(PROCEDURE|FUNCTION|VIEW|TABLE|INDEX|TRIGGER)|DROP\\s+(TABLE|PROCEDURE|FUNCTION|VIEW|INDEX|TRIGGER)|SELECT|INSERT|UPDATE|DELETE|MERGE|BEGIN\\s+TRANSACTION|COMMIT\\s+TRANSACTION|ROLLBACK\\s+TRANSACTION|USE\\s+[\\w_]+)`,
      'i'
    );

    for (const segment of goSegments) {
      let remainingSegment = segment.trim();
      if (!remainingSegment) continue;

      // Store DDL statements as a whole, attempt to split DMLs by semicolon
      while (remainingSegment.length > 0) {
        const keywordMatch = remainingSegment.match(topLevelKeywordsRegex);
        if (keywordMatch) {
          const keyword = keywordMatch[0].trim().toUpperCase();

          // For DDLs like CREATE PROCEDURE/FUNCTION/VIEW/TABLE, try to keep them as one block.
          // This is a simplified heuristic: find the next top-level keyword or end of segment.
          if (keyword.startsWith('CREATE') || keyword.startsWith('ALTER') || keyword.startsWith('DROP')) {
            if (keyword.includes('PROCEDURE') || keyword.includes('FUNCTION') || keyword.includes('VIEW') || keyword.includes('TRIGGER')) {
              // More complex DDLs: try to find their logical end.
              // This is still a simplification. A robust solution needs a proper parser.
              // For now, we assume these DDLs extend to the end of the current GO-segment
              // or until the next major DDL keyword *that is not part of its own body*.
              // This is hard to do with regex alone.
              // Let's assume for V1, such a DDL block consumes the rest of the GO-segment.
              partitions.push(remainingSegment);
              remainingSegment = ''; // Consumed the rest of the segment
              continue;
            } else if (keyword.includes('TABLE') || keyword.includes('INDEX')) {
              // For CREATE/ALTER/DROP TABLE/INDEX, these are typically single statements ending with ';'
              // However, ALTER TABLE can have multiple comma-separated actions.
              // We need to find the terminating semicolon for these statements.
              let statementEnd = -1;
              let openParens = 0;
              for (let i = 0; i < remainingSegment.length; i++) {
                if (remainingSegment[i] === '(') openParens++;
                else if (remainingSegment[i] === ')') openParens--;
                else if (remainingSegment[i] === ';' && openParens === 0) {
                  statementEnd = i;
                  break;
                }
              }
              if (statementEnd !== -1) {
                partitions.push(remainingSegment.substring(0, statementEnd + 1).trim());
                remainingSegment = remainingSegment.substring(statementEnd + 1).trim();
                continue;
              } else {
                // If no semicolon, assume it's the rest of the segment
                partitions.push(remainingSegment);
                remainingSegment = '';
                continue;
              }
            }
          }

          // For DML statements (SELECT, INSERT, UPDATE, DELETE, MERGE) and transactions
          // Split by semicolon, but try to respect parentheses.
          // This is a simplified approach.
          let statementEnd = -1;
          let openParens = 0;
          let inStringLiteral = false;
          let stringChar = '';

          for (let i = 0; i < remainingSegment.length; i++) {
            const char = remainingSegment[i];
            const nextChar = remainingSegment[i+1];

            if (inStringLiteral) {
              if (char === stringChar) {
                if (nextChar === stringChar) { // Handle escaped quotes like '' in SQL Server
                  i++;
                } else {
                  inStringLiteral = false;
                }
              }
            } else {
              if (char === "'" || char === '"' || char === '`') { // Start of string literal
                inStringLiteral = true;
                stringChar = char;
              } else if (char === '(') {
                openParens++;
              } else if (char === ')') {
                openParens--;
              } else if (char === ';' && openParens === 0) {
                statementEnd = i;
                break;
              }
            }
          }

          if (statementEnd !== -1) {
            const part = remainingSegment.substring(0, statementEnd + 1).trim();
            if (part) partitions.push(part);
            remainingSegment = remainingSegment.substring(statementEnd + 1).trim();
          } else {
            // No semicolon found, or it's within parentheses/string. Treat the rest as one block.
            const part = remainingSegment.trim();
            if (part) partitions.push(part);
            remainingSegment = '';
          }
        } else {
          // No top-level keyword found at the beginning of the remaining segment.
          // This could be a continuation of a previous statement or just loose SQL.
          // Split by semicolon as a last resort for this part.
          const semicolonIndex = remainingSegment.indexOf(';');
          if (semicolonIndex !== -1) {
            const part = remainingSegment.substring(0, semicolonIndex + 1).trim();
            if (part) partitions.push(part);
            remainingSegment = remainingSegment.substring(semicolonIndex + 1).trim();
          } else {
            const part = remainingSegment.trim();
            if (part) partitions.push(part);
            remainingSegment = '';
          }
        }
      }
    }
    return partitions.filter(p => p.length > 0);
  }

  private findSecondLevelPartitions(
    firstLevelSql: string,
    parentBlockType: string
  ): SharedSecondLevelPartition[] {
    try {
      // Extract basic context information from the first level SQL
      const context: BlockParsingContext = {
        parentBlockType,
        parentBlockCode: firstLevelSql,
        currentNestingLevel: 0,
        availableVariables: this.extractVariables(firstLevelSql),
        availableTables: this.extractTables(firstLevelSql),
        executionHistory: []
      };

      // Use the enhanced parser to get sophisticated block analysis
      const enhancedPartitions = this.enhancedParser.parseWithContext(firstLevelSql, context);
      
      logger.info(`Enhanced parser identified ${enhancedPartitions.length} sub-blocks for ${parentBlockType}`);
      
      return enhancedPartitions;
    } catch (error) {
      logger.error('Error in enhanced second-level partitioning:', error);
      
      // Fallback to simple parsing if enhanced parsing fails
      return this.fallbackSimplePartitioning(firstLevelSql, parentBlockType);
    }
  }

  private extractVariables(sql: string): string[] {
    const variables = new Set<string>();
    const variablePattern = /@\w+/g;
    let match;
    
    while ((match = variablePattern.exec(sql)) !== null) {
      variables.add(match[0]);
    }
    
    return Array.from(variables);
  }

  private extractTables(sql: string): string[] {
    const tables = new Set<string>();
    const upperSql = sql.toUpperCase();
    
    // Simple table extraction patterns
    const tablePatterns = [
      /FROM\s+(\w+)/g,
      /JOIN\s+(\w+)/g,
      /UPDATE\s+(\w+)/g,
      /INSERT\s+INTO\s+(\w+)/g,
      /DELETE\s+FROM\s+(\w+)/g
    ];
    
    tablePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(upperSql)) !== null) {
        if (match[1] && !['SELECT', 'FROM', 'WHERE'].includes(match[1])) {
          tables.add(match[1].toLowerCase());
        }
      }
    });
    
    return Array.from(tables);
  }

  private fallbackSimplePartitioning(firstLevelSql: string, parentBlockType: string): SharedSecondLevelPartition[] {
    // Simple fallback implementation for backward compatibility
    const simpleBlocks: SharedSecondLevelPartition[] = [];
    const lines = firstLevelSql.split('\n');
    
    let currentBlock = '';
    let blockStart = 1;
    let executionOrder = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.length === 0 || line.startsWith('--')) continue;
      
      currentBlock += (currentBlock ? '\n' : '') + lines[i];
      
      // Simple block termination detection
      if (line.endsWith(';') || 
          line.toUpperCase().includes('END') ||
          i === lines.length - 1) {
        
        if (currentBlock.trim()) {
          simpleBlocks.push({
            code: currentBlock.trim(),
            type: BlockType.BUSINESS_LOGIC,
            startLine: blockStart,
            endLine: i + 1,
            summary: null,
            detailedExplanation: null,
            
            // Enhanced fields with basic values
            blockTitle: 'SQL Block',
            blockSqlSnippet: currentBlock.trim(),
            blockExplanation: 'SQL code block requiring analysis',
            blockComplexity: 'moderate',
            blockDependencies: [],
            blockLineStart: blockStart,
            blockLineEnd: i + 1,
            
            tableInfo: null,
            logicalFlowSteps: null,
            
            parentBlockContext: parentBlockType,
            executionOrder: ++executionOrder,
            hasNestedBlocks: false,
            businessPurpose: undefined
          });
        }
        
        currentBlock = '';
        blockStart = i + 2;
      }
    }
    
    return simpleBlocks;
  }

  /**
   * Main analysis method - migrated from analysis-actions.ts
   */
  async runAnalysis(
    fullSqlCode: string,
    blockType: string,
    providerName?: LlmType // Use imported LlmType directly
  ): Promise<FullAnalysisPayload | AnalysisError> {
    if (!fullSqlCode || fullSqlCode.trim() === "") {
      return { error: "SQL code cannot be empty." };
    }
    if (!blockType) {
      return { error: "Block type must be selected." };
    }

    // const chunks = this.chunkSqlScript(fullSqlCode); // Old method
    const chunks = this.partitionSqlScriptV1(fullSqlCode);

    if (chunks.length === 0) {
      return { error: "No processable SQL script found. The input might be empty or only contain separators like GO or ;." };
    }

    const currentProvider = providerName || 'google-generic';
    const llm = LlmFactory.getInstance(currentProvider);
    logger.info(`AnalysisService using LLM provider: ${currentProvider}`);

    const totalChunks = chunks.length;
    const chunkAnalyses: SingleAnalysisResult[] = [];
    let overallScriptSummary: string | undefined = undefined;

    // Generate overall script summary if there's more than one chunk,
    // OR if there's one chunk and the user indicated it's a "SQL Script"
    if (totalChunks > 1 || (totalChunks === 1 && blockType === "SQL Script")) {
      try {
        const prompt = `SQL Script:\n\`\`\`sql\n${fullSqlCode}\n\`\`\``;
        const llmRequest: LlmRequest = { prompt, systemPrompt: SYSTEM_PROMPTS.summarizeEntireScript };
        const llmResponse = await this.invokeLlmWithRetry(
          llm, // Pass the llm instance
          llmRequest,
          this.retryMaxRetries,
          this.retryInitialDelayMs
        );
        const summaryResult = await validateAndParseResponse<SummarizeEntireScriptOutput>(llmResponse.content, SummarizeEntireScriptOutputSchema);
        overallScriptSummary = summaryResult.overallSummary;
      } catch (e: any) {
        logger.warn(`Could not generate overall script summary: ${e.message}`, e);
        // Non-fatal, proceed with chunk analysis
      }
    }

    for (let i = 0; i < totalChunks; i++) {
      const currentChunkSql = chunks[i];
      const chunkNumber = i + 1;
      const chunkBlockTypeHint = blockType;

      let secondLevelPartitions = this.findSecondLevelPartitions(currentChunkSql, chunkBlockTypeHint);

      try {
        // --- First-level analysis ---
        // --- First-level analysis ---
        const summarizePrompt = `Analyze this SQL code block.\nBlock Type: ${chunkBlockTypeHint}\nPartition Level: first\nSQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\``;
        const summarizeLlmRequest: LlmRequest = { prompt: summarizePrompt, systemPrompt: SYSTEM_PROMPTS.summarizeCodeBlock };
        const summaryLlmResponse = await this.invokeLlmWithRetry(llm, summarizeLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const firstLevelSummary = await validateAndParseResponse<SummarizeCodeBlockOutput>(summaryLlmResponse.content, SummarizeCodeBlockOutputSchema);

        const explainPrompt = `Explain this SQL code block.\nBlock Type: ${chunkBlockTypeHint}\nPartition Level: first\nSQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\``;
        const explainLlmRequest: LlmRequest = { prompt: explainPrompt, systemPrompt: SYSTEM_PROMPTS.explainLogicRules };
        const explainLlmResponse = await this.invokeLlmWithRetry(llm, explainLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const firstLevelExplanation = await validateAndParseResponse<ExplainSqlBlockOutput>(explainLlmResponse.content, ExplainSqlBlockOutputSchema);

        const tableInfoPrompt = `SQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\`\nBlock Type Hint: ${chunkBlockTypeHint}`;
        const tableInfoLlmRequest: LlmRequest = { prompt: tableInfoPrompt, systemPrompt: SYSTEM_PROMPTS.extractTableInfo };
        const tableInfoLlmResponse = await this.invokeLlmWithRetry(llm, tableInfoLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const tableInfoResult = await validateAndParseResponse<ExtractTableInfoOutput>(tableInfoLlmResponse.content, ExtractTableInfoOutputSchema);

        const logicalFlowPrompt = `SQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\`\nBlock Type Hint: ${chunkBlockTypeHint}`;
        const logicalFlowLlmRequest: LlmRequest = { prompt: logicalFlowPrompt, systemPrompt: SYSTEM_PROMPTS.generateSqlLogicalFlow };
        const logicalFlowLlmResponse = await this.invokeLlmWithRetry(llm, logicalFlowLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const logicalFlowResult = await validateAndParseResponse<GenerateSqlLogicalFlowOutput>(logicalFlowLlmResponse.content, GenerateSqlLogicalFlowOutputSchema);

        // --- Second-level analysis ---
        for (const subPartition of secondLevelPartitions) {
          subPartition.summary = null;
          subPartition.detailedExplanation = null;
          try {
            const subSummarizePrompt = `Analyze this SQL sub-block.\nParent Block Type: ${chunkBlockTypeHint}\nSub-Block Type: ${subPartition.type}\nPartition Level: second\nSQL Code:\n\`\`\`sql\n${subPartition.code}\n\`\`\``;
            const subSummarizeLlmRequest: LlmRequest = { prompt: subSummarizePrompt, systemPrompt: SYSTEM_PROMPTS.summarizeCodeBlock };
            const subSummaryLlmResponse = await this.invokeLlmWithRetry(llm, subSummarizeLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
            subPartition.summary = await validateAndParseResponse<SummarizeCodeBlockOutput>(subSummaryLlmResponse.content, SummarizeCodeBlockOutputSchema);
          } catch (subError: any) {
            logger.error(`Error summarizing sub-partition (type: ${subPartition.type}): ${subError.message}`, subError);
          }

          try {
            const subExplainPrompt = `Explain this SQL sub-block.\nParent Block Type: ${chunkBlockTypeHint}\nSub-Block Type: ${subPartition.type}\nPartition Level: second\nSQL Code:\n\`\`\`sql\n${subPartition.code}\n\`\`\``;
            const subExplainLlmRequest: LlmRequest = { prompt: subExplainPrompt, systemPrompt: SYSTEM_PROMPTS.explainLogicRules };
            const subExplainLlmResponse = await this.invokeLlmWithRetry(llm, subExplainLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
            subPartition.detailedExplanation = await validateAndParseResponse<ExplainSqlBlockOutput>(subExplainLlmResponse.content, ExplainSqlBlockOutputSchema);
          } catch (subError: any) {
            logger.error(`Error explaining sub-partition (type: ${subPartition.type}): ${subError.message}`, subError);
          }
        }

        const singleAnalysisResult: SingleAnalysisResult = {
          summary: firstLevelSummary,
          detailedExplanation: firstLevelExplanation,
          tableInfo: tableInfoResult || { identifiedTables: [] }, // Ensure fallback for empty/failed tableInfo
          logicalFlowSteps: logicalFlowResult || { flowSteps: [] }, // Ensure fallback for empty/failed logicalFlow
          rawCode: currentChunkSql,
          blockType: chunkBlockTypeHint,
          chunkNumber: chunkNumber,
          totalChunks: totalChunks,
          // TODO: The SingleAnalysisResult type in shared/types/analysis.ts needs to be updated
          // to officially include a field like `secondLevelPartitions: SecondLevelPartition[]`.
          // For now, we assert the type. This will be fixed when shared types are updated.
          secondLevelPartitions: secondLevelPartitions as any
        };
        chunkAnalyses.push(singleAnalysisResult);

      } catch (e) {
        console.error(`Error during AI analysis for chunk ${chunkNumber}:`, e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during chunk analysis.";
        return {
          error: `AI Analysis Failed for Chunk ${chunkNumber} of ${totalChunks}`,
          details: errorMessage,
          chunkNumber: chunkNumber,
        };
      }
    }

    if (chunkAnalyses.length === 0 && totalChunks > 0 && !overallScriptSummary) {
      return { error: "No results were generated from SQL code analysis, though chunks were processed." };
    }

    return {
      chunkAnalyses,
      overallScriptSummary,
      originalFullSqlCode: fullSqlCode
    };
  }

  /**
   * Generate HTML report from analysis data
   */
  async generateReport(analysisData: FullAnalysisPayload, reportType: 'chunk' | 'full' = 'full'): Promise<string> {
    // This would use the existing report generation logic
    // For now, return a placeholder
    const timestamp = new Date().toISOString();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SQL Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
            .chunk { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            .code { background: #f5f5f5; padding: 10px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SQL Analysis Report</h1>
            <p>Generated: ${timestamp}</p>
            <p>Chunks Analyzed: ${analysisData.chunkAnalyses.length}</p>
          </div>
          ${analysisData.chunkAnalyses.map((chunk, idx) => `
            <div class="chunk">
              <h2>Chunk ${chunk.chunkNumber} of ${chunk.totalChunks}</h2>
              <h3>SQL Code:</h3>
              <div class="code">${chunk.rawCode}</div>
              <h3>Summary:</h3>
              <p>${JSON.stringify(chunk.summary, null, 2)}</p>
            </div>
          `).join('')}
        </body>
      </html>
    `;
  }

  // The runAnalysisOnChunk method seems to be a leftover from a previous refactoring attempt or an alternative path.
  // It uses analyzeWithLlm from llm-flows.ts which is what we are moving away from in the main runAnalysis method.
  // For this refactoring, I am focusing on the main runAnalysis method.
  // This method (runAnalysisOnChunk) would also need refactoring if it's intended to be used.
  // For now, I'll leave it as is, as the primary goal is to refactor the main `runAnalysis` path.
  private async runAnalysisOnChunk(chunk: string, model: 'gemini' | 'openai'): Promise<any> { // Changed AnalysisResult to any
    try {
      // Define schemas for different analysis types
      // These schemas are now imported at the top of the file.
      // This method is NOT being refactored to use this.llmInstance in this pass.
      const codeBlockSchema = SummarizeCodeBlockOutputSchema;
      // Removed erroneous object literal for codeBlockSchema

      const logicRulesSchema = ExplainSqlBlockOutputSchema;
      // Removed erroneous object literal for logicRulesSchema

      const tableInfoSchema = ExtractTableInfoOutputSchema;
      // Removed erroneous object literal for tableInfoSchema

      const logicalFlowSchema = GenerateSqlLogicalFlowOutputSchema;
      // Removed erroneous object literal for logicalFlowSchema

      const scriptSummarySchema = SummarizeEntireScriptOutputSchema;
      // Removed erroneous object literal for scriptSummarySchema

      // This part still uses analyzeWithLlm, which internally uses the LlmFactory with 'gemini' or 'openai'.
      // This is distinct from the main refactoring of runAnalysis which now uses 'google-generic' via this.llmInstance.
      // If runAnalysisOnChunk were to be used, it would need similar refactoring or LlmFactory would need
      // to be passed the specific model type from a higher level.
      const [
        codeBlockAnalysis,
        logicRulesAnalysis,
        tableInfoAnalysis,
        logicalFlowAnalysis,
        scriptSummary
      ] = await Promise.all([
        analyzeWithLlm(chunk, SYSTEM_PROMPTS.summarizeCodeBlock, model, codeBlockSchema),
        analyzeWithLlm(chunk, SYSTEM_PROMPTS.explainLogicRules, model, logicRulesSchema),
        analyzeWithLlm(chunk, SYSTEM_PROMPTS.extractTableInfo, model, tableInfoSchema),
        analyzeWithLlm(chunk, SYSTEM_PROMPTS.generateSqlLogicalFlow, model, logicalFlowSchema),
        analyzeWithLlm(chunk, SYSTEM_PROMPTS.summarizeEntireScript, model, scriptSummarySchema)
      ]);

      return {
        codeBlockAnalysis,
        logicRulesAnalysis,
        tableInfoAnalysis,
        logicalFlowAnalysis,
        scriptSummary
      };
    } catch (error) {
      console.error('Error running analysis on chunk:', error);
      throw new Error(`Failed to analyze SQL chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 