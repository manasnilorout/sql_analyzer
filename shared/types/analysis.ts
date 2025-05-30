// Shared types between frontend and server

export interface SingleAnalysisResult {
  summary: any; // SummarizeCodeBlockOutput - keeping as any for now to avoid complex imports
  detailedExplanation: any; // ExplainSqlBlockOutput
  tableInfo: any; // ExtractTableInfoOutput
  logicalFlowSteps: any; // GenerateSqlLogicalFlowOutput
  rawCode: string;
  blockType: string;
  chunkNumber: number;
  totalChunks: number;
}

export interface FullAnalysisPayload {
  chunkAnalyses: SingleAnalysisResult[];
  overallScriptSummary?: string;
  originalFullSqlCode: string;
}

export interface AnalysisError {
  error: string;
  details?: string;
  chunkNumber?: number;
}

export type LlmModel = 'gemini' | 'openai';

export interface AnalysisRequest {
  sqlCode: string;
  blockType: string;
  model?: LlmModel;
}

export interface ReportGenerationRequest {
  analysisData: FullAnalysisPayload;
  reportType?: 'chunk' | 'full';
}

export type AnalysisResponse = FullAnalysisPayload | AnalysisError; 