// Shared types between frontend and server

// Based on CoreConceptSchema in summarize-code-block.ts
export interface SharedCoreConcept {
  concept: string;
  explanation: string;
  codeExample?: string;
}

// Based on SummarizeCodeBlockOutputSchema in summarize-code-block.ts
export interface SharedSummarizeCodeBlockOutput {
  mainPurpose: string;
  keyOperations: string[];
  dataFlow: string;
  coreSqlConcepts: SharedCoreConcept[];
  businessLogicInsights?: string[];
  beginnerFriendlyTips?: string[];
}

// --- Nested Schemas for SharedExplainSqlBlockOutput ---
// Based on ParameterDetailSchema
export interface SharedParameterDetail {
  name: string;
  dataType?: string;
  purpose?: string;
}

// Based on BlockSummarySchema
export interface SharedBlockSummary {
  identifiedType: string;
  purpose: string;
  inputParameters?: SharedParameterDetail[];
  functionReturnType?: string;
}

// Based on ProceduralStepSchema
export interface SharedProceduralStep {
  stepNumber: number;
  statement: string;
  description: string;
}

// Based on TargetObjectSchema
export interface SharedTargetObject {
  name?: string;
  targetType?: string;
  isUsedAsSourceElsewhereInBlock?: boolean;
  writeOperation?: string;
}

// Based on SourceTableDetailSchema
export interface SharedSourceTableDetail {
  name: string;
  type: string;
  roleDescription: string;
  isTargetTableItself?: boolean;
}

// Based on JoinConditionSchema
export interface SharedJoinCondition {
  tablesInvolved: string;
  joinType?: string;
  onCondition: string;
  purpose: string;
}

// Based on JoinAnalysisSchema
export interface SharedJoinAnalysis {
  joinsWithTargetTableExplanation?: string;
  conditions?: SharedJoinCondition[];
}

// Based on TransformationRuleOrFunctionLogicSchema
export interface SharedTransformationRuleOrFunctionLogic {
  targetColumn?: string;
  transformationLogic: string;
  description: string;
  sourceColumns?: string[];
}

// Based on FilterConditionDetailSchema
export interface SharedFilterConditionDetail {
  clause: "WHERE" | "HAVING";
  conditionSnippet: string;
  explanation: string;
  impliedBusinessRule?: string;
}

// Based on WindowFunctionSchema
export interface SharedWindowFunction {
  functionSignature: string;
  purpose: string;
}

// Based on UDForProcedureUsageSchema
export interface SharedUDForProcedureUsage {
  name: string;
  usageContext: string;
  parametersPassed?: string[];
  inferredPurpose?: string;
}

// Based on FilteringAndBusinessRulesSchema
export interface SharedFilteringAndBusinessRules {
  whereClause?: string;
  whereClauseExplanation?: string;
  havingClause?: string;
  havingClauseExplanation?: string;
  detailedConditions?: SharedFilterConditionDetail[];
  windowFunctions?: SharedWindowFunction[];
  udfsOrProceduresUsedInFiltering?: SharedUDForProcedureUsage[];
  otherImpliedBusinessRules?: string[];
}

// Based on OutputFlowSchema
export interface SharedOutputFlow {
  textualRepresentation?: string;
  dataSources?: string[];
  keyTransformationsInFlow?: string[];
  dataSink?: string;
}

// Based on DependencySchema
export interface SharedDependency {
  objectName: string;
  objectType: string;
  usageContext: string;
  inferredPurpose?: string;
}

// Based on CrossReferenceSchema
export interface SharedCrossReference {
  referencedObject: string;
  similarityPercentage?: number;
  overlapDescription: string;
}

// Based on DependenciesAndCrossReferencesSchema
export interface SharedDependenciesAndCrossReferences {
  externalObjectsCalledOrReferenced?: SharedDependency[];
  potentialLogicOverlaps?: SharedCrossReference[];
}

// Based on CodeQualitySuggestionSchema
export interface SharedCodeQualitySuggestion {
  suggestion: string;
  reasoning?: string;
  suggestionType: "Pitfall" | "BestPractice" | "OptimizationHint" | "Readability" | "Maintainability" | "PerformanceWarning";
}

// Based on CodeQualitySuggestionsSchema
export interface SharedCodeQualitySuggestions {
  suggestions?: SharedCodeQualitySuggestion[];
}

// --- Types for Table Info ---
// Based on IdentifiedTableSchema from extract-table-info.ts
export interface SharedIdentifiedTable {
  name: string;
  primaryRole: "Source" | "Target" | "SourceAndTarget" | "Mentioned";
  roleDescription: string;
  operations: string[];
}

// Based on ExtractTableInfoOutputSchema from extract-table-info.ts
export interface SharedExtractTableInfoOutput {
  identifiedTables: SharedIdentifiedTable[];
}

// --- Types for Logical Flow ---
// Based on LogicalStepSchema from generate-sql-logical-flow.ts
export interface SharedLogicalStep {
  id?: string;
  title?: string;
  description: string;
  sqlReference?: string;
  type:
    | "DataRetrieval"
    | "Filtering"
    | "Joining"
    | "Transformation"
    | "Aggregation"
    | "Sorting"
    | "Modification"
    | "CTEInitialization"
    | "CTEConsumption"
    | "SubqueryExecution"
    | "SetOperation"
    | "WindowFunction"
    | "ConditionalLogic"
    | "VariableAssignment"
    | "Output"
    | "Other";
}

// Based on GenerateSqlLogicalFlowOutputSchema from generate-sql-logical-flow.ts
export interface SharedGenerateSqlLogicalFlowOutput {
  flowSteps: SharedLogicalStep[];
}


// Based on ExplainSqlBlockOutputSchema in explain-logic-rules.ts
export interface SharedExplainSqlBlockOutput {
  chunkKeySummary?: string;
  blockSummary?: SharedBlockSummary; // Made optional as per current server-side handling for safety.
  proceduralControlFlow?: SharedProceduralStep[];
  targetObject?: SharedTargetObject;
  sourceTables?: SharedSourceTableDetail[];
  joinAnalysis?: SharedJoinAnalysis;
  transformationRulesOrFunctionLogic?: SharedTransformationRuleOrFunctionLogic[];
  filteringAndBusinessRules?: SharedFilteringAndBusinessRules;
  outputFlow?: SharedOutputFlow;
  dependenciesAndCrossReferences?: SharedDependenciesAndCrossReferences;
  codeQualitySuggestions?: SharedCodeQualitySuggestions;
  overallLogicExplanationForJuniorDev?: string;
}

// Definition for Second-Level Partitions
export type BlockType =
  | 'declaration'
  | 'initialization'
  | 'business_logic'
  | 'transaction'
  | 'loop'
  | 'conditional'
  | 'error_handling'
  | 'data_operation'
  | 'calculation'
  | 'cleanup';

export interface SharedSecondLevelPartition {
  code: string;
  type: string; // legacy field
  startLine?: number;
  endLine?: number;
  summary?: SharedSummarizeCodeBlockOutput | null;
  detailedExplanation?: SharedExplainSqlBlockOutput | null;
  blockTitle?: string;
  blockSqlSnippet?: string;
  blockExplanation?: string;
  blockType?: BlockType;
  blockComplexity?: 'simple' | 'moderate' | 'complex';
  blockDependencies?: string[];
  blockLineStart?: number;
  blockLineEnd?: number;
  executionOrder?: number;
  // tableInfo and logicalFlowSteps are not planned for second-level in this iteration
}

export interface SingleAnalysisResult {
  summary: SharedSummarizeCodeBlockOutput | null;
  detailedExplanation: SharedExplainSqlBlockOutput | null;
  tableInfo: SharedExtractTableInfoOutput | null;
  logicalFlowSteps: SharedGenerateSqlLogicalFlowOutput | null;
  rawCode: string;
  blockType: string; // This is the blockType of the first-level partition
  chunkNumber: number;
  totalChunks: number;
  secondLevelPartitions?: SharedSecondLevelPartition[];
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
  totalChunks?: number; // Added field
}

export type LlmModel = 'gemini' | 'openai'; // This type might be related to the old /analyze endpoint's 'model' param

export interface AnalysisRequest {
  sqlCode: string;
  blockType: string;
  model?: LlmModel; // This was for the old /analyze endpoint, might be deprecated or repurposed.
  llmProvider?: string; // Added for provider selection e.g. 'openai', 'google-generic', 'vertexai'
}

export interface ReportGenerationRequest {
  analysisData: FullAnalysisPayload;
  reportType?: 'chunk' | 'full';
}

export type AnalysisResponse = FullAnalysisPayload | AnalysisError; 