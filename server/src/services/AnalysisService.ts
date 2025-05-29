import { summarizeCodeBlock, SummarizeCodeBlockInput, SummarizeCodeBlockOutput } from "../ai/flows/summarize-code-block";
import { explainSqlBlockDetailed as explainLogicRules, ExplainSqlBlockInput, ExplainSqlBlockOutput } from "../ai/flows/explain-logic-rules";
import { extractTableInfo, ExtractTableInfoInput, ExtractTableInfoOutput } from "../ai/flows/extract-table-info";
import { generateSqlLogicalFlow, GenerateSqlLogicalFlowInput, GenerateSqlLogicalFlowOutput } from "../ai/flows/generate-sql-logical-flow";
import { summarizeEntireSqlScript, SummarizeEntireScriptInput, SummarizeEntireScriptOutput } from "../ai/flows/summarize-entire-script";
import type { FullAnalysisPayload, AnalysisError, SingleAnalysisResult } from "@shared/types/analysis";

export class AnalysisService {
  /**
   * Utility to split SQL script into chunks
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
      return chunks.length > 0 ? chunks : (trimmedSql === "GO" || trimmedSql.match(/^(\s*GO\s*)+$/) ? [] : [trimmedSql]);
    } else {
      // Fallback to semicolon splitting if GO is not found
      const chunks = trimmedSql
        .split(';')
        .map(chunk => {
          const trimmedChunk = chunk.trim();
          return trimmedChunk;
        })
        .filter(chunk => chunk.length > 0); 
      
      if (chunks.length === 0 && trimmedSql.length > 0) {
          return [trimmedSql]; // Treat as single chunk if only content is non-empty and no separators
      }
      return chunks;
    }
  }

  /**
   * Main analysis method - migrated from analysis-actions.ts
   */
  async runAnalysis(
    fullSqlCode: string,
    blockType: string
  ): Promise<FullAnalysisPayload | AnalysisError> {
    if (!fullSqlCode || fullSqlCode.trim() === "") {
      return { error: "SQL code cannot be empty." };
    }
    if (!blockType) {
      return { error: "Block type must be selected." };
    }

    const chunks = this.chunkSqlScript(fullSqlCode);
    
    if (chunks.length === 0) {
      return { error: "No processable SQL script found. The input might be empty or only contain separators like GO or ;." };
    }
    
    const totalChunks = chunks.length;
    const chunkAnalyses: SingleAnalysisResult[] = [];
    let overallScriptSummary: string | undefined = undefined;

    // Generate overall script summary if there's more than one chunk,
    // OR if there's one chunk and the user indicated it's a "SQL Script"
    if (totalChunks > 1 || (totalChunks === 1 && blockType === "SQL Script")) {
      try {
        const overallSummaryInput: SummarizeEntireScriptInput = { fullSqlCode };
        const summaryResult = await summarizeEntireSqlScript(overallSummaryInput);
        overallScriptSummary = summaryResult.overallSummary;
      } catch (e) {
        console.warn("Could not generate overall script summary:", e);
        // Non-fatal, proceed with chunk analysis
      }
    }

    for (let i = 0; i < totalChunks; i++) {
      const currentChunkSql = chunks[i];
      const chunkNumber = i + 1;
      const chunkBlockTypeHint = blockType; 

      try {
        const summarizeInput: SummarizeCodeBlockInput = { code: currentChunkSql, blockType: chunkBlockTypeHint };
        const explainInput: ExplainSqlBlockInput = { sqlCode: currentChunkSql, blockType: chunkBlockTypeHint };
        const tableInfoInput: ExtractTableInfoInput = { sqlCode: currentChunkSql, blockType: chunkBlockTypeHint };
        const logicalFlowInput: GenerateSqlLogicalFlowInput = { sqlCode: currentChunkSql, blockType: chunkBlockTypeHint };

        // Promise.all to run analyses in parallel for a chunk
        const [summaryResult, explanationResult, tableInfoResult, logicalFlowResult] = await Promise.all([
          summarizeCodeBlock(summarizeInput),
          explainLogicRules(explainInput),
          extractTableInfo(tableInfoInput),
          generateSqlLogicalFlow(logicalFlowInput),
        ]);

        chunkAnalyses.push({
          summary: summaryResult,
          detailedExplanation: explanationResult,
          tableInfo: tableInfoResult || { identifiedTables: [] }, 
          logicalFlowSteps: logicalFlowResult || { flowSteps: [] },
          rawCode: currentChunkSql,
          blockType: chunkBlockTypeHint,
          chunkNumber: chunkNumber,
          totalChunks: totalChunks,
        });
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
} 