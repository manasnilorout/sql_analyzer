import type { FullAnalysisPayload, AnalysisError, SingleAnalysisResult } from "@shared/types/analysis";
import { z } from 'genkit'; // Genkit's z import might still be used by schemas, or can be replaced by 'zod'
import { LlmFactory } from '../ai/llm/LlmFactory';
import { AbstractLlmImpl, LlmRequest, LlmResponse } from '../ai/llm/AbstractLlmImpl';
import { SYSTEM_PROMPTS, validateAndParseResponse } from '../ai/flows/llm-flows'; // Assuming validateAndParseResponse is exported
import { logger } from '../../utils/logger';

// Import Zod Schemas and TypeScript types for outputs from their original flow files
import { SummarizeCodeBlockOutputSchema, type SummarizeCodeBlockOutput } from '../ai/flows/summarize-code-block';
import { ExplainSqlBlockOutputSchema, type ExplainSqlBlockOutput } from '../ai/flows/explain-logic-rules';
import { ExtractTableInfoOutputSchema, type ExtractTableInfoOutput } from '../ai/flows/extract-table-info';
import { GenerateSqlLogicalFlowOutputSchema, type GenerateSqlLogicalFlowOutput } from '../ai/flows/generate-sql-logical-flow';
import { SummarizeEntireScriptOutputSchema, type SummarizeEntireScriptOutput } from '../ai/flows/summarize-entire-script';


// Define SecondLevelPartition interface (already includes SummarizeCodeBlockOutput and ExplainSqlBlockOutput)
interface SecondLevelPartition {
  code: string;
  type: string;
  startLine?: number;
  endLine?: number;
  summary?: SummarizeCodeBlockOutput | null;
  detailedExplanation?: ExplainSqlBlockOutput | null;
}

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

  constructor() {
    // Constructor can be used for other initializations if needed
    this.retryMaxRetries = DEFAULT_MAX_RETRIES;
    this.retryInitialDelayMs = DEFAULT_INITIAL_DELAY_MS;
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
    _parentBlockType: string // parentBlockType might be used later for context-specific parsing
  ): SecondLevelPartition[] {
    const subPartitions: SecondLevelPartition[] = [];
    // Normalize line endings and remove leading/trailing whitespace from the whole block
    let remainingSql = firstLevelSql.replace(/\r\n/g, '\n').trim();
    let currentIndex = 0; // Tracks position in the original firstLevelSql for slicing

    // Comments should have been stripped by partitionSqlScriptV1, but good to keep in mind for future
    // For simplicity, this version won't re-strip comments.

    // Keywords that define blocks or standalone statements (case-insensitive)
    const keywords = [
      'BEGIN', 'END', 'IF', 'ELSE', 'WHILE', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE',
      'WITH', // For CTEs
      'TRY', 'CATCH' // For TRY...CATCH blocks
      // ADD OTHER KEYWORDS AS NEEDED: 'CREATE', 'ALTER', 'DROP', 'TRUNCATE' for DDL-like statements if any pass through first-level
    ];

    // Regex to find any of the keywords, ensuring they are whole words
    // We also want to capture semicolons as potential statement terminators for DML
    const keywordRegex = new RegExp(`(^|\\s+|\\()(${keywords.join('|')})(\\s+|\\(|;|$)`, 'ims');

    // Helper to find a matching END for a BEGIN, respecting nesting
    const findMatchingEnd = (sqlSlice: string, startIndex: number): number => {
      let depth = 0;
      let position = startIndex;
      const beginRegex = /\bBEGIN\b/ig;
      const endRegex = /\bEND\b/ig;
      let lastMatchEnd = -1;

      // First, ensure we are at a BEGIN
      const testBeginRegex = /^\s*BEGIN\b/i;
      if(!testBeginRegex.test(sqlSlice.substring(position))) {
          return -1; // Should not happen if called correctly
      }

      // Find the first BEGIN
      let match = beginRegex.exec(sqlSlice.substring(position));
      if (match) {
          position += match.index; // Move to the start of BEGIN
          depth = 1;
          position += match[0].length;
      } else {
          return -1; // No BEGIN found
      }

      while (depth > 0 && position < sqlSlice.length) {
          const nextBegin = beginRegex.exec(sqlSlice.substring(position));
          const nextEnd = endRegex.exec(sqlSlice.substring(position));

          if (nextBegin && (!nextEnd || nextBegin.index < nextEnd.index)) {
              depth++;
              position += nextBegin.index + nextBegin[0].length;
          } else if (nextEnd) {
              depth--;
              position += nextEnd.index + nextEnd[0].length;
              if (depth === 0) {
                  lastMatchEnd = position;
                  return lastMatchEnd; // Found the matching END
              }
          } else {
              break; // No more BEGIN or END found, unterminated block
          }
      }
      return -1; // No matching END found
    };

    // Helper to find simple statement end (semicolon, or next keyword)
    const findStatementEnd = (sqlSlice: string, startIndex: number): number => {
        let pos = startIndex;
        let openParens = 0;
        let inStringLiteral = false;
        let stringChar = '';

        while(pos < sqlSlice.length) {
            const char = sqlSlice[pos];
            const nextChar = sqlSlice[pos+1];

            if (inStringLiteral) {
                if (char === stringChar && nextChar === stringChar) { // escaped quote
                    pos++;
                } else if (char === stringChar) {
                    inStringLiteral = false;
                }
            } else if (char === "'" || char === '"' || char === '`') {
                inStringLiteral = true;
                stringChar = char;
            } else if (char === '(') {
                openParens++;
            } else if (char === ')') {
                openParens--;
            } else if (char === ';' && openParens === 0) {
                return pos + 1; // include semicolon
            }

            // Check for next keyword if not in parens or string
            if (openParens === 0 && !inStringLiteral) {
                const aheadSlice = sqlSlice.substring(pos);
                const nextKeywordMatch = aheadSlice.match(new RegExp(`^\\s*(${keywords.join('|')})(\\s+|\\(|;|$)`, 'i'));
                if (nextKeywordMatch && pos > startIndex) { // Make sure we've consumed some part of the statement
                     // Check if this keyword is part of the current statement (e.g. SELECT ... FROM (SELECT ...))
                     // This is a simplification, full context is hard.
                     // For now, any keyword will terminate the current simple DML.
                    return pos; // end before the next keyword
                }
            }
            pos++;
        }
        return sqlSlice.length; // End of string
    };


    let currentParsePos = 0;
    while(currentParsePos < remainingSql.length) {
        const unprocessedSql = remainingSql.substring(currentParsePos);
        const trimmedUnprocessedSql = unprocessedSql.trimStart();
        const leadingWhitespaceLength = unprocessedSql.length - trimmedUnprocessedSql.length;

        if (trimmedUnprocessedSql.length === 0) break;

        const searchStartIndex = currentParsePos + leadingWhitespaceLength;
        let matchFound = false;

        // Test for BEGIN...END blocks
        if (trimmedUnprocessedSql.toUpperCase().startsWith('BEGIN')) {
            const blockEndIndex = findMatchingEnd(remainingSql, searchStartIndex);
            if (blockEndIndex !== -1) {
                subPartitions.push({
                    code: remainingSql.substring(searchStartIndex, blockEndIndex).trim(),
                    type: 'BEGIN_END_BLOCK'
                });
                currentParsePos = blockEndIndex;
                matchFound = true;
            }
        }
        // IF condition THEN block [ELSE block]
        else if (trimmedUnprocessedSql.toUpperCase().startsWith('IF')) {
            // This is complex. A simple version: find the statement/block for IF, then look for ELSE.
            // For now, let's just identify the IF statement itself.
            // A more robust solution would parse the condition and the THEN/ELSE blocks.
            // This needs to find the end of the IF condition (e.g. before BEGIN or a statement)
            // then find the end of the THEN block, then look for ELSE.

            // Simplified: capture up to the start of its BEGIN or to its statement end
            let ifEndIndex = findStatementEnd(remainingSql, searchStartIndex + "IF".length); // Start after "IF "

            // Check if the IF condition is followed by BEGIN
            const nextWordAfterIf = remainingSql.substring(ifEndIndex).trimStart().toUpperCase();
            if (nextWordAfterIf.startsWith('BEGIN')) {
                const thenBlockStartIndex = searchStartIndex + remainingSql.substring(searchStartIndex).toUpperCase().indexOf('BEGIN');
                const thenBlockEndIndex = findMatchingEnd(remainingSql, thenBlockStartIndex);
                if (thenBlockEndIndex !== -1) {
                    ifEndIndex = thenBlockEndIndex; // The IF block includes the THEN BEGIN...END

                    // Look for ELSE
                    const elseSearchSql = remainingSql.substring(ifEndIndex).trimStart();
                    if (elseSearchSql.toUpperCase().startsWith('ELSE')) {
                        const elseStartIndexOriginal = ifEndIndex + remainingSql.substring(ifEndIndex).indexOf(elseSearchSql);
                        const elseBodySql = elseSearchSql.substring('ELSE'.length).trimStart();
                        if (elseBodySql.toUpperCase().startsWith('BEGIN')) {
                            const elseBlockStartIndex = elseStartIndexOriginal + elseSearchSql.substring('ELSE'.length).toUpperCase().indexOf('BEGIN');
                            const elseBlockEndIndex = findMatchingEnd(remainingSql, elseBlockStartIndex);
                            if (elseBlockEndIndex !== -1) {
                                ifEndIndex = elseBlockEndIndex;
                            } else { // Unterminated ELSE BEGIN
                                ifEndIndex = remainingSql.length; // Consume rest
                            }
                        } else { // ELSE followed by single statement
                            const elseStatementEnd = findStatementEnd(remainingSql, elseStartIndexOriginal + 'ELSE'.length);
                            ifEndIndex = elseStatementEnd;
                        }
                    }
                } else { // Unterminated IF ... BEGIN
                     ifEndIndex = remainingSql.length; // Consume rest
                }
            }
            // If not BEGIN, findStatementEnd should have found the end of the IF statement.

            subPartitions.push({
                code: remainingSql.substring(searchStartIndex, ifEndIndex).trim(),
                type: 'IF_BLOCK' // Could be IF_STATEMENT or IF_BEGIN_END_BLOCK
            });
            currentParsePos = ifEndIndex;
            matchFound = true;
        }
        // WHILE loop
        else if (trimmedUnprocessedSql.toUpperCase().startsWith('WHILE')) {
            // Similar to IF, find condition, then find BEGIN...END or single statement
            let whileEndIndex = findStatementEnd(remainingSql, searchStartIndex + "WHILE".length); // Start after "WHILE "
            const nextWordAfterWhile = remainingSql.substring(whileEndIndex).trimStart().toUpperCase();

            if (nextWordAfterWhile.startsWith('BEGIN')) {
                const loopBodyStartIndex = searchStartIndex + remainingSql.substring(searchStartIndex).toUpperCase().indexOf('BEGIN');
                const loopBodyEndIndex = findMatchingEnd(remainingSql, loopBodyStartIndex);
                if (loopBodyEndIndex !== -1) {
                    whileEndIndex = loopBodyEndIndex;
                } else { // Unterminated WHILE ... BEGIN
                    whileEndIndex = remainingSql.length; // Consume rest
                }
            }
            subPartitions.push({
                code: remainingSql.substring(searchStartIndex, whileEndIndex).trim(),
                type: 'WHILE_LOOP'
            });
            currentParsePos = whileEndIndex;
            matchFound = true;
        }
        // DML Statements (SELECT, INSERT, UPDATE, DELETE, MERGE)
        // Also TRY, CATCH as simple statements for now
        else if (['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'WITH', 'TRY', 'CATCH'].some(kw => trimmedUnprocessedSql.toUpperCase().startsWith(kw))) {
            const dmlType = trimmedUnprocessedSql.substring(0, trimmedUnprocessedSql.indexOf(' ')).toUpperCase();
            const statementEndIndex = findStatementEnd(remainingSql, searchStartIndex);
            subPartitions.push({
                code: remainingSql.substring(searchStartIndex, statementEndIndex).trim(),
                type: `DML_${dmlType}` // Or more generic 'STATEMENT'
            });
            currentParsePos = statementEndIndex;
            matchFound = true;
        }

        if (!matchFound) {
            // If no specific block type is found, find the next semicolon or end of string
            // This is to handle leftover code or simple statements not caught above
            let advanceTo = remainingSql.indexOf(';', currentParsePos);
            if (advanceTo === -1 || advanceTo < currentParsePos) { // No semicolon or already passed
                advanceTo = remainingSql.length;
            } else {
                advanceTo += 1; // Include the semicolon
            }

            const remainingCodeChunk = remainingSql.substring(currentParsePos, advanceTo).trim();
            if (remainingCodeChunk) {
                 subPartitions.push({ code: remainingCodeChunk, type: 'UNKNOWN_STATEMENT' });
            }
            currentParsePos = advanceTo;
        }
    }

    return subPartitions.filter(p => p.code.length > 0);
  }

  /**
   * Main analysis method - migrated from analysis-actions.ts
   */
  async runAnalysis(
    fullSqlCode: string,
    blockType: string,
    providerName?: LlmFactory.LlmType // Added LlmType from LlmFactory
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
        const summaryResult = await validateAndParseResponse(llmResponse.content, SummarizeEntireScriptOutputSchema);
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
        const summarizePrompt = `Analyze this SQL code block.\nBlock Type: ${chunkBlockTypeHint}\nPartition Level: first\nSQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\``;
        const summarizeLlmRequest: LlmRequest = { prompt: summarizePrompt, systemPrompt: SYSTEM_PROMPTS.summarizeCodeBlock };
        const summaryLlmResponse = await this.invokeLlmWithRetry(llm, summarizeLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const firstLevelSummary = await validateAndParseResponse(summaryLlmResponse.content, SummarizeCodeBlockOutputSchema);

        const explainPrompt = `Explain this SQL code block.\nBlock Type: ${chunkBlockTypeHint}\nPartition Level: first\nSQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\``;
        const explainLlmRequest: LlmRequest = { prompt: explainPrompt, systemPrompt: SYSTEM_PROMPTS.explainLogicRules };
        const explainLlmResponse = await this.invokeLlmWithRetry(llm, explainLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const firstLevelExplanation = await validateAndParseResponse(explainLlmResponse.content, ExplainSqlBlockOutputSchema);

        const tableInfoPrompt = `SQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\`\nBlock Type Hint: ${chunkBlockTypeHint}`;
        const tableInfoLlmRequest: LlmRequest = { prompt: tableInfoPrompt, systemPrompt: SYSTEM_PROMPTS.extractTableInfo };
        const tableInfoLlmResponse = await this.invokeLlmWithRetry(llm, tableInfoLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const tableInfoResult = await validateAndParseResponse(tableInfoLlmResponse.content, ExtractTableInfoOutputSchema);

        const logicalFlowPrompt = `SQL Code:\n\`\`\`sql\n${currentChunkSql}\n\`\`\`\nBlock Type Hint: ${chunkBlockTypeHint}`;
        const logicalFlowLlmRequest: LlmRequest = { prompt: logicalFlowPrompt, systemPrompt: SYSTEM_PROMPTS.generateSqlLogicalFlow };
        const logicalFlowLlmResponse = await this.invokeLlmWithRetry(llm, logicalFlowLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
        const logicalFlowResult = await validateAndParseResponse(logicalFlowLlmResponse.content, GenerateSqlLogicalFlowOutputSchema);

        // --- Second-level analysis ---
        for (const subPartition of secondLevelPartitions) {
          subPartition.summary = null;
          subPartition.detailedExplanation = null;
          try {
            const subSummarizePrompt = `Analyze this SQL sub-block.\nParent Block Type: ${chunkBlockTypeHint}\nSub-Block Type: ${subPartition.type}\nPartition Level: second\nSQL Code:\n\`\`\`sql\n${subPartition.code}\n\`\`\``;
            const subSummarizeLlmRequest: LlmRequest = { prompt: subSummarizePrompt, systemPrompt: SYSTEM_PROMPTS.summarizeCodeBlock };
            const subSummaryLlmResponse = await this.invokeLlmWithRetry(llm, subSummarizeLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
            subPartition.summary = await validateAndParseResponse(subSummaryLlmResponse.content, SummarizeCodeBlockOutputSchema);
          } catch (subError: any) {
            logger.error(`Error summarizing sub-partition (type: ${subPartition.type}): ${subError.message}`, subError);
          }

          try {
            const subExplainPrompt = `Explain this SQL sub-block.\nParent Block Type: ${chunkBlockTypeHint}\nSub-Block Type: ${subPartition.type}\nPartition Level: second\nSQL Code:\n\`\`\`sql\n${subPartition.code}\n\`\`\``;
            const subExplainLlmRequest: LlmRequest = { prompt: subExplainPrompt, systemPrompt: SYSTEM_PROMPTS.explainLogicRules };
            const subExplainLlmResponse = await this.invokeLlmWithRetry(llm, subExplainLlmRequest, this.retryMaxRetries, this.retryInitialDelayMs);
            subPartition.detailedExplanation = await validateAndParseResponse(subExplainLlmResponse.content, ExplainSqlBlockOutputSchema);
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
        mainPurpose: z.string(),
        keyOperations: z.array(z.string()),
        dataFlow: z.string(),
        coreSqlConcepts: z.array(z.object({
          concept: z.string(),
          explanation: z.string(),
          codeExample: z.string().optional()
        })),
        businessLogicInsights: z.array(z.string()),
        beginnerFriendlyTips: z.array(z.string())
      });

      const logicRulesSchema = ExplainSqlBlockOutputSchema;
      const tableInfoSchema = ExtractTableInfoOutputSchema;
      const logicalFlowSchema = GenerateSqlLogicalFlowOutputSchema;
      const scriptSummarySchema = SummarizeEntireScriptOutputSchema;

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