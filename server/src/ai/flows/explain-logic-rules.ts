
// This is an auto-generated file from Firebase Studio.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting and explaining a SQL code block in extreme detail,
 * following a structured framework suitable for deep analysis by developers, especially junior ones.
 *
 * - explainSqlBlockDetailed (exported as explainLogicRules) - A function that takes SQL code and returns a comprehensive structured explanation.
 * - ExplainSqlBlockInput - The input type.
 * - ExplainSqlBlockOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

// --- Input Schema ---
const ExplainSqlBlockInputSchema = z.object({
  sqlCode: z.string().describe('The SQL code block to analyze. If multiple DDL statements (e.g. multiple CREATE VIEW) are present for a specific blockType (e.g. View), the analysis will focus on the first complete DDL statement found.'),
  blockType: z.string().describe('The type of the SQL code block provided by the user (e.g., "Stored Procedure", "View", "User Defined Function", "SQL Script", or a second-level type like "BEGIN_END_BLOCK"). The AI should confirm or refine this based on the primary operation within the provided code. If "SQL Script" is chosen and multiple operations exist, the AI will attempt to analyze the most significant one or provide a general overview.'),
  partitionDetail: z.object({
    level: z.enum(['first', 'second']),
    type: z.string().optional().describe('The specific type of the partition, especially for second-level (e.g., IF_BLOCK, WHILE_LOOP).')
  }).optional().describe('Details about the partition level and type, if applicable.')
});
export type ExplainSqlBlockInput = z.infer<typeof ExplainSqlBlockInputSchema>;

// --- Output Schema Definitions ---

// Input Parameter Detail
const ParameterDetailSchema = z.object({
    name: z.string().describe("Name of the input parameter (e.g., '@CustomerID', 'StartDate')."),
    dataType: z.string().optional().describe("SQL data type of the parameter (e.g., 'INT', 'VARCHAR(100)', 'DATE')."),
    purpose: z.string().optional().describe("Brief inferred purpose or usage of this parameter within the Stored Procedure or User Defined Function."),
});

// 1. Block Summary
const BlockSummarySchema = z.object({
  identifiedType: z.string().describe("AI's identified SQL operation type of the primary block being analyzed (e.g., 'INSERT INTO ... SELECT', 'CREATE VIEW', 'MERGE', 'UPDATE ... FROM', 'CREATE PROCEDURE', 'CREATE FUNCTION'). This might refine the user's input 'blockType'."),
  purpose: z.string().describe("A concise (1-2 sentences) auto-summarized purpose of this primary SQL block. What is its primary goal? If multiple DDL objects of the specified blockType are found, mention that the deep dive focuses on the first one and others should be analyzed separately."),
  inputParameters: z.array(ParameterDetailSchema).optional().describe("If the block is a Stored Procedure or User Defined Function, list its input parameters with their names, data types, and inferred purpose. Views do not have DDL-defined input parameters."),
  functionReturnType: z.string().optional().describe("If the block is a User Defined Function, describe its return type (e.g., 'Scalar: INT', 'Table: RETURNS @result TABLE (Col1 INT, Col2 VARCHAR(50))', 'Inline Table-Valued Function returning SELECT ...').")
});

// Procedural Step Detail
const ProceduralStepSchema = z.object({
    stepNumber: z.number().describe("Sequential number of the procedural step."),
    statement: z.string().describe("The SQL statement or control flow construct (e.g., IF, WHILE, DECLARE, SET @var = ..., BEGIN TRY...END TRY)."),
    description: z.string().describe("A brief explanation of this procedural step's purpose or action within the overall logic of the script or procedure.")
});


// 2. Target Object (previously TargetTable)
const TargetObjectSchema = z.object({ 
  name: z.string().optional().describe("Name of the target table being written to, the View being defined, or the Function being defined (e.g., 'fact_customer_orders', 'vw_MonthlySales', 'udf_CalculateDiscount')."),
  targetType: z.string().optional().describe("Inferred type of the target (e.g., 'Fact table', 'Dimension table', 'Staging table', 'Temporary table', 'View Definition', 'Function Definition', 'Output of DML')."),
  isUsedAsSourceElsewhereInBlock: z.boolean().optional().describe("Is this target table also read from (e.g., for deduplication) within the same SQL block? Not typically applicable to View/Function definitions themselves but to the tables they might query."),
  writeOperation: z.string().optional().describe("How data is written or how the object is defined (e.g., 'INSERT INTO', 'UPDATE', 'SELECT INTO', 'MERGE (as target)', 'Defines structure for CREATE VIEW', 'Defines logic for CREATE FUNCTION')."),
});

// 3. Source Tables
const SourceTableDetailSchema = z.object({
  name: z.string().describe("Full name of the source table, including alias if used (e.g., 'dbo.Orders o', 'Customers c', 'CTE_SalesData sales')."),
  type: z.string().describe("Type or role in the query (e.g., 'Base Driving Table', 'Join Table', 'Lookup Table', 'CTE Source', 'Subquery Source'). Distinguish between CTEs and actual tables."),
  roleDescription: z.string().describe("Brief description of what this table contributes or how it's used (e.g., 'Main source of order transactions', 'Provides customer demographic data', 'Used for status code to name mapping', 'Intermediate result set for sales aggregation')."),
  isTargetTableItself: z.boolean().optional().describe("Set to true if this source table is also the primary target of the SQL block (e.g. in an UPDATE statement or a MERGE statement)."),
});

// 4. Join Analysis
const JoinConditionSchema = z.object({
  tablesInvolved: z.string().describe("Tables being joined and their aliases (e.g., 'Orders o JOIN Customers c')."),
  joinType: z.string().optional().describe("Type of JOIN used (e.g., 'INNER JOIN', 'LEFT JOIN', 'CROSS APPLY'). Strive to always identify this. If not specified, infer if possible, otherwise can be 'Unspecified' or similar."),
  onCondition: z.string().describe("The full ON or USING condition snippet (e.g., 'o.CustomerID = c.CustomerID AND o.OrderDate = c.EffectiveDate')."),
  purpose: z.string().describe("Briefly explain the purpose of this specific join (e.g., 'To link orders with customer details', 'To filter records based on existence in another table')."),
});

const JoinAnalysisSchema = z.object({
  joinsWithTargetTableExplanation: z.string().optional().describe("If the target table is part of a JOIN (e.g., for deduplication in an INSERT, or self-update logic), explain its role in the join here."),
  conditions: z.array(JoinConditionSchema).optional().describe("Detailed breakdown of each JOIN operation."),
});

// 5. Transformation Rules or Function Logic (previously TransformationRules)
const TransformationRuleOrFunctionLogicSchema = z.object({ 
  targetColumn: z.string().optional().describe("The name of the column in the output/target, the variable being set, or a description of the calculation if inside a function body. If an unaliased expression, try to describe it briefly or state 'Unnamed Expression'."),
  transformationLogic: z.string().describe("The SQL expression, function call, or logic used to derive this column's value or perform a calculation (e.g., 'o.UnitPrice * o.Quantity', 'ISNULL(c.PhoneNumber, 'N/A')', 'CASE WHEN x > 0 THEN 1 ELSE 0 END', 'RETURN @calculated_value * 0.1')."),
  description: z.string().describe("Explanation of what this transformation does: Is it a direct mapping, calculation, aggregation, conditional logic, UDF call, type conversion, string manipulation etc.? Be specific about the logic. For functions, explain the core calculation steps."),
  sourceColumns: z.array(z.string()).optional().describe("List of source columns or variables primarily involved in this transformation/calculation."),
});

// 6. Filtering and Business Rules
const FilterConditionDetailSchema = z.object({
  clause: z.enum(["WHERE", "HAVING"]).describe("The clause type (WHERE or HAVING)."),
  conditionSnippet: z.string().describe("The specific filter condition snippet (e.g., 'order_date >= ''2023-01-01''', 'SUM(order_amount) > 1000')."),
  explanation: z.string().describe("Plain English explanation of what this condition does."),
  impliedBusinessRule: z.string().optional().describe("Any business rule this condition suggests (e.g., 'Process only recent orders', 'Focus on high-value customers')."),
});

const WindowFunctionSchema = z.object({
  functionSignature: z.string().describe("The full window function call (e.g., 'ROW_NUMBER() OVER (PARTITION BY c.CustomerID ORDER BY o.OrderDate DESC)')."),
  purpose: z.string().describe("Explanation of what this window function achieves (e.g., 'Assigns a unique rank to each order per customer based on date to find the latest order')."),
});

const UDForProcedureUsageSchema = z.object({ // This is for *used* UDFs/Procs, not for defining them
  name: z.string().describe("Name of the UDF or Stored Procedure used within the analyzed block."),
  usageContext: z.string().describe("How and where it's used in the SQL block (e.g., 'In SELECT list for column X', 'In WHERE clause condition Y', 'Called to perform an action Z')."),
  parametersPassed: z.array(z.string()).optional().describe("Parameters passed to it, if identifiable (e.g., 'ProductID', 'OrderDate')."),
  inferredPurpose: z.string().optional().describe("A brief (1-line) inferred purpose of this called UDF/Procedure, if discernible (e.g., 'Calculates customer-specific discount', 'Logs execution status')."),
});

const FilteringAndBusinessRulesSchema = z.object({
  whereClause: z.string().optional().describe("The complete WHERE clause snippet, if present."),
  whereClauseExplanation: z.string().optional().describe("Overall explanation of the business logic or filtering criteria applied by the WHERE clause."),
  havingClause: z.string().optional().describe("The complete HAVING clause snippet, if present."),
  havingClauseExplanation: z.string().optional().describe("Overall explanation of the business logic or filtering criteria applied by the HAVING clause after aggregation."),
  detailedConditions: z.array(FilterConditionDetailSchema).optional().describe("Breakdown of individual conditions in WHERE/HAVING."),
  windowFunctions: z.array(WindowFunctionSchema).optional().describe("Details of any window functions used."),
  udfsOrProceduresUsedInFiltering: z.array(UDForProcedureUsageSchema).optional().describe("Details of UDFs or Stored Procedures used specifically within filtering logic (WHERE/HAVING), beyond those in transformations."),
  otherImpliedBusinessRules: z.array(z.string()).optional().describe("List any broader business rules that can be inferred from the filtering, transformations, or overall logic, not directly tied to a single WHERE/HAVING condition."),
});

// 7. Output Flow
const OutputFlowSchema = z.object({
  textualRepresentation: z.string().optional().describe("A textual DAG or step-by-step flow from sources to target/output using a structured format like '[TYPE:Name] -> [OPERATION:Detail] -> [TYPE:Name]'. e.g., '[TABLE:Orders] -> [JOIN:Customers on o.CID=c.ID] -> [FILTER:IsActive=1] -> [AGG:SUM(Total)] -> [TARGET_TABLE:CustomerAggregates]'. Be specific about the operation details. For Views and Functions, adapt appropriately (e.g., '[FUNC_IN:Params] -> [LOGIC_STEP:Calculation] -> [FUNC_OUT:ReturnType]')."),
  dataSources: z.array(z.string()).optional().describe("Key data sources for this block (tables, CTEs, or function inputs)."),
  keyTransformationsInFlow: z.array(z.string()).optional().describe("Major transformations or logical steps in the flow."),
  dataSink: z.string().optional().describe("Primary target (table/view name) or description of the output (e.g., 'View Definition', 'Function Return Value')."),
});

// 8. Dependencies & Cross References
const DependencySchema = z.object({
    objectName: z.string().describe("Name of the dependent object (UDF, Stored Proc, View, Table etc.)."),
    objectType: z.string().describe("Type of the dependent object (e.g., 'User Defined Function', 'Stored Procedure', 'View', 'Table')."),
    usageContext: z.string().describe("How this dependency is used or why it's relevant (e.g., 'Called in SELECT list', 'Table queried in FROM clause', 'Procedure executed')."),
    inferredPurpose: z.string().optional().describe("A brief (1-line) inferred purpose of this called/referenced object, if discernible (e.g., 'Provides standardized address formatting', 'Fetches product details')."),
});
const CrossReferenceSchema = z.object({
    referencedObject: z.string().describe("Name of another SQL object (e.g., another Stored Proc, View)."),
    similarityPercentage: z.number().optional().describe("Estimated percentage of logic overlap (0-100)."),
    overlapDescription: z.string().describe("Description of the shared logic or potential redundancy."),
});

const DependenciesAndCrossReferencesSchema = z.object({
  externalObjectsCalledOrReferenced: z.array(DependencySchema).optional().describe("List ALL UDFs, Stored Procedures, Views, or Tables *explicitly called or referenced* from within this SQL block (e.g., functions in SELECT/WHERE, procedures executed, tables in FROM/JOIN). Identify nested calls if possible."),
  potentialLogicOverlaps: z.array(CrossReferenceSchema).optional().describe("AI-detected hints of potential logic reuse or overlap with other database objects. Focus on substantial similarities."),
});


// 9. Code Quality Suggestions
const CodeQualitySuggestionSchema = z.object({
  suggestion: z.string().describe("The specific suggestion for improvement or observation."),
  reasoning: z.string().optional().describe("Why this is a suggestion (e.g., performance impact, readability, maintainability)."),
  suggestionType: z.enum(["Pitfall", "BestPractice", "OptimizationHint", "Readability", "Maintainability", "PerformanceWarning"]).describe("Type of suggestion."),
});

const CodeQualitySuggestionsSchema = z.object({
  suggestions: z.array(CodeQualitySuggestionSchema).optional().describe("List of code quality suggestions, pitfalls, or best practices observed or relevant. Specifically look for issues like implicit data type conversions in JOINs or WHERE clauses and flag them as 'PerformanceWarning' if found."),
});

// --- Main Output Schema ---
export const ExplainSqlBlockOutputSchema = z.object({ // Added export
  chunkKeySummary: z.string().optional().describe("A 2-3 sentence high-level summary specifically for the current SQL chunk/block being analyzed, providing immediate context before diving into details."),
  blockSummary: BlockSummarySchema.describe("High-level summary of the primary SQL block analyzed, including any input parameters and function return types."),
  proceduralControlFlow: z.array(ProceduralStepSchema).optional().describe("For Stored Procedures or SQL Scripts with procedural logic, this lists these steps sequentially."),
  targetObject: TargetObjectSchema.optional().describe("Details about the primary target table, view definition, or function definition of this SQL block."),
  sourceTables: z.array(SourceTableDetailSchema).optional().describe("Detailed list of source tables used in the block."),
  joinAnalysis: JoinAnalysisSchema.optional().describe("Analysis of JOIN operations within the block."),
  transformationRulesOrFunctionLogic: z.array(TransformationRuleOrFunctionLogicSchema).optional().describe("Explanation of data transformations, column derivations, or the internal logic of a User Defined Function."),
  filteringAndBusinessRules: FilteringAndBusinessRulesSchema.optional().describe("Analysis of WHERE, HAVING, window functions, and implied business rules."),
  outputFlow: OutputFlowSchema.optional().describe("Description of the data flow from source to target or function output, using a structured text format."),
  dependenciesAndCrossReferences: DependenciesAndCrossReferencesSchema.optional().describe("Identified dependencies on other database objects (tables, views, UDFs, procs) and potential logic overlaps."),
  codeQualitySuggestions: CodeQualitySuggestionsSchema.optional().describe("Suggestions related to code quality, pitfalls, and best practices. Should include warnings for implicit data type conversions."),
  overallLogicExplanationForJuniorDev: z.string().optional().describe("A concluding paragraph summarizing the entire block's logic in simple terms for a junior developer, tying all the above sections together."),
});
export type ExplainSqlBlockOutput = z.infer<typeof ExplainSqlBlockOutputSchema>;


// --- Exported Function ---
export async function explainSqlBlockDetailed(input: ExplainSqlBlockInput): Promise<ExplainSqlBlockOutput> {
  const result = await explainSqlBlockFlow(input);
  // Ensure all optional arrays and nested optional arrays/objects are initialized if undefined by the LLM
  return {
    chunkKeySummary: result.chunkKeySummary,
    blockSummary: {
        ...(result.blockSummary || { identifiedType: "Unknown", purpose: "Purpose not determined." }),
        inputParameters: (result.blockSummary?.inputParameters || []).map(p => ({...p, dataType: p.dataType || "N/A", purpose: p.purpose || "N/A" })),
        functionReturnType: result.blockSummary?.functionReturnType || (result.blockSummary?.identifiedType?.toLowerCase().includes("function") ? "Return type not specified" : undefined),
    },
    proceduralControlFlow: (result.proceduralControlFlow || []).map(p => ({...p, statement: p.statement || "N/A", description: p.description || "N/A"})),
    targetObject: result.targetObject ? {
        ...result.targetObject,
        name: result.targetObject.name || "N/A",
        targetType: result.targetObject.targetType || "N/A",
        writeOperation: result.targetObject.writeOperation || "N/A",
    } : undefined,
    sourceTables: (result.sourceTables || []).map(st => ({...st, type: st.type || "N/A", roleDescription: st.roleDescription || "N/A"})),
    joinAnalysis: result.joinAnalysis ? {
        joinsWithTargetTableExplanation: result.joinAnalysis.joinsWithTargetTableExplanation,
        conditions: (result.joinAnalysis.conditions || []).map(j => ({ ...j, joinType: j.joinType || "Unknown Type", onCondition: j.onCondition || "N/A", purpose: j.purpose || "N/A" })),
    } : undefined,
    transformationRulesOrFunctionLogic: (result.transformationRulesOrFunctionLogic || []).map(t => ({...t, targetColumn: t.targetColumn || "Unknown Column/Logic Step", transformationLogic: t.transformationLogic || "N/A", description: t.description || "N/A", sourceColumns: t.sourceColumns || []})),
    filteringAndBusinessRules: result.filteringAndBusinessRules ? {
        ...result.filteringAndBusinessRules,
        whereClause: result.filteringAndBusinessRules.whereClause,
        whereClauseExplanation: result.filteringAndBusinessRules.whereClauseExplanation,
        havingClause: result.filteringAndBusinessRules.havingClause,
        havingClauseExplanation: result.filteringAndBusinessRules.havingClauseExplanation,
        detailedConditions: (result.filteringAndBusinessRules.detailedConditions || []).map(dc => ({...dc, clause: dc.clause || "WHERE", conditionSnippet: dc.conditionSnippet || "N/A", explanation: dc.explanation || "N/A"})),
        windowFunctions: (result.filteringAndBusinessRules.windowFunctions || []).map(wf => ({...wf, functionSignature: wf.functionSignature || "N/A", purpose: wf.purpose || "N/A"})),
        udfsOrProceduresUsedInFiltering: (result.filteringAndBusinessRules.udfsOrProceduresUsedInFiltering || []).map(udf => ({...udf, name: udf.name || "N/A", usageContext: udf.usageContext || "N/A", parametersPassed: udf.parametersPassed || [], inferredPurpose: udf.inferredPurpose})),
        otherImpliedBusinessRules: result.filteringAndBusinessRules.otherImpliedBusinessRules || [],
    } : undefined,
    outputFlow: result.outputFlow ? {
        ...result.outputFlow,
        textualRepresentation: result.outputFlow.textualRepresentation,
        dataSources: result.outputFlow.dataSources || [],
        keyTransformationsInFlow: result.outputFlow.keyTransformationsInFlow || [],
        dataSink: result.outputFlow.dataSink,
    } : undefined,
    dependenciesAndCrossReferences: result.dependenciesAndCrossReferences ? {
        ...result.dependenciesAndCrossReferences,
        externalObjectsCalledOrReferenced: (result.dependenciesAndCrossReferences.externalObjectsCalledOrReferenced || []).map(obj => ({...obj, objectName: obj.objectName || "N/A", objectType: obj.objectType || "N/A", usageContext: obj.usageContext || "N/A", inferredPurpose: obj.inferredPurpose})),
        potentialLogicOverlaps: (result.dependenciesAndCrossReferences.potentialLogicOverlaps || []).map(obj => ({...obj, referencedObject: obj.referencedObject || "N/A", overlapDescription: obj.overlapDescription || "N/A"})),
    } : undefined,
    codeQualitySuggestions: result.codeQualitySuggestions ? {
        suggestions: (result.codeQualitySuggestions.suggestions || []).map(s => ({...s, suggestion: s.suggestion || "N/A", suggestionType: s.suggestionType || "BestPractice"})),
    } : undefined,
    overallLogicExplanationForJuniorDev: result.overallLogicExplanationForJuniorDev || "Overall explanation could not be generated.",
  };
}

// --- Genkit Prompt Definition ---
const prompt = ai.definePrompt({
  name: 'explainSqlBlockDetailedPrompt_v13', // Version bump for major enhancements
  input: {schema: ExplainSqlBlockInputSchema},
  output: {schema: ExplainSqlBlockOutputSchema}, 
  prompt: `You are an expert SQL Server code analyst. Your task is to dissect the provided SQL code and explain it comprehensively, following the detailed JSON schema.
  The explanation must be thorough, clear, and exceptionally helpful for a **junior developer** trying to understand complex SQL end-to-end.
  **CRITICAL: Process the ENTIRE SQL code provided, from beginning to end, without any truncation.** Be thorough and ensure all critical details are captured. Be concise where appropriate to manage output token usage but prioritize completeness of information.

  {{#if partitionDetail}}
  This is a {{partitionDetail.level}}-level partition.
  {{#if partitionDetail.type}}
  The specific type of this partition is '{{partitionDetail.type}}'.
  Your analysis should focus on this specific block and its role. If it's a second-level partition, consider its function within the broader context of its parent first-level partition (e.g., a BEGIN...END block inside a Stored Procedure).
  {{/if}}
  {{/if}}

  User-provided SQL block type (for context of this specific analysis): {{{blockType}}}
  SQL Code:
  \`\`\`sql
  {{{sqlCode}}}
  \`\`\`

  **IMPORTANT Instructions for AI based on \`blockType\`, \`partitionDetail\`, and content:**
  *   If \`partitionDetail.level\` is 'first' AND (\`{{{blockType}}}\` is "View" OR \`{{{blockType}}}\` is "Stored Procedure" OR \`{{{blockType}}}\` is "User Defined Function"), focus your analysis on the **first complete and valid DDL statement (CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION) of that type found in the \`sqlCode\`**. Subsequent DDL statements of the same type within the same \`sqlCode\` input should be ignored for this detailed breakdown. If multiple such objects are detected, state this in the 'purpose' field of the 'blockSummary'.
  *   If \`partitionDetail.level\` is 'first' AND \`{{{blockType}}}\` is "SQL Script" AND the \`sqlCode\` contains multiple distinct operations, attempt to analyze the most significant DML or DDL operation, or provide a general overview. Make this focus clear in the Block Summary.
  *   If \`partitionDetail.level\` is 'second', your analysis should be laser-focused on the provided \`{{{sqlCode}}}\` which represents a specific sub-block (e.g., a BEGIN...END block, an IF statement, a WHILE loop, or a DML statement). The \`{{{blockType}}}\` will reflect this specific sub-block's nature (e.g., 'BEGIN_END_BLOCK', 'IF_BLOCK', 'DML_SELECT').
  *   For all other cases (e.g. first-level simple DML, or any block type not explicitly covered by the rules above), analyze the provided code as a single logical unit according to its \`{{{blockType}}}\`.

  **Populate ALL fields in the output JSON schema to the best of your ability for the GIVEN CODE BLOCK.** If a section or sub-field is genuinely not applicable to the *specific code block being analyzed* (especially for smaller second-level partitions), you may omit optional fields or use empty arrays for optional array fields. For required string fields where information is truly missing for the given block, state "Not applicable for this specific block" or "Could not be determined for this block." Do not invent information. For example, a simple 'SELECT' statement (as a second-level partition) won't have 'inputParameters' or 'proceduralControlFlow'.

  **Explanation Framework (guide for your analysis):**

  **0. chunkKeySummary (Optional String):**
     *   Provide a 2-3 sentence high-level summary specifically for THIS SQL CHUNK/BLOCK being analyzed. This gives immediate context.

  **1. blockSummary:**
     *   \`identifiedType\`: Based on the primary operation you are analyzing (considering the rule above), confirm or refine the user-provided \`{{{blockType}}}\` (e.g., "INSERT INTO ... SELECT", "CREATE VIEW", "CREATE PROCEDURE", "CREATE FUNCTION").
     *   \`purpose\`: In 1-2 clear sentences, what is the main goal of this primary SQL block/object being analyzed? If multiple DDL objects of the specified blockType are found, note here that the analysis focuses on the first complete one found, and other objects should be analyzed separately for a full deep dive.
     *   \`inputParameters\` (Array, Optional): **If the primary block being analyzed is a Stored Procedure or User Defined Function**, list ALL its input parameters. For each parameter:
         *   \`name\`: The parameter name (e.g., "@CustomerID", "StartDate").
         *   \`dataType\` (Optional): The SQL data type (e.g., "INT", "VARCHAR(100)", "DATE").
         *   \`purpose\` (Optional): Briefly explain the parameter's role.
         *   **Note**: SQL Server Views do not have DDL-defined input parameters. Do not list any for views.
     *   \`functionReturnType\` (String, Optional): **If the primary block is a User Defined Function**, clearly describe its return type (e.g., "Scalar: INT", "Table: RETURNS @result TABLE (Col1 INT, Col2 VARCHAR(50))", "Inline Table-Valued Function returning SELECT ...").

  **1.5. proceduralControlFlow (Optional Array):**
     *   **If the primary block being analyzed is a Stored Procedure or SQL Script containing procedural logic (e.g., IF/ELSE, WHILE, DECLARE/SET variables, TRY/CATCH, sequences of DML statements):**
     *   List each significant procedural step. For each step:
         *   \`stepNumber\`: A sequential number for the step.
         *   \`statement\`: The SQL statement or control flow construct (e.g., "DECLARE @Var INT;", "IF @Var > 0", "UPDATE MyTable...").
         *   \`description\`: A brief explanation of what this specific step does or its purpose in the control flow.

  **2. targetObject (Optional):** Details of the primary table being modified, or the View/Function being defined.
     *   \`name\`: Full name of the target table, or the View/Function being defined (e.g., "dbo.fact_customer_orders", "vw_MonthlySales", "udf_CalculateTotal").
     *   \`targetType\`: Infer its nature (e.g., "Fact table", "Dimension table", "View Definition", "Function Definition", "Output of DML operation").
     *   \`isUsedAsSourceElsewhereInBlock\`: Is this target table also read from within this *same* SQL block (e.g., for an UPDATE statement's source, or a MERGE's source/target)? Usually "No" for View/Function definitions themselves.
     *   \`writeOperation\`: How is data being written or the object defined? (e.g., "INSERT INTO", "UPDATE", "Defines structure for CREATE VIEW", "Defines logic for CREATE FUNCTION"). For Functions, this should clearly state it defines the function.

  **3. sourceTables (Optional Array):** List all distinct tables, CTEs, or significant subqueries used as data sources *within the analyzed block/object*.
     *   For each source:
         *   \`name\`: Full name, include alias (e.g., "raw.Orders o", "dim.Customers cust", "SalesCTE").
         *   \`type\`: Its role (e.g., "Base Driving Table", "Join Table", "Lookup Table", "CTE Source").
         *   \`roleDescription\`: What data does it provide?
         *   \`isTargetTableItself\`: True if this source is also the main target of a DML operation (common in UPDATEs or MERGEs).

  **4. joinAnalysis (Optional):** Details for JOINs *within the analyzed block/object*.
     *   \`joinsWithTargetTableExplanation\`: If the target table (from Point 2, if a DML target) is involved in a JOIN, explain its role.
     *   \`conditions\` (Array): For EACH distinct JOIN operation:
         *   \`tablesInvolved\`: e.g., "Orders o JOIN OrderDetails od".
         *   \`joinType\` (Optional): Crucial (e.g., "INNER JOIN", "LEFT OUTER JOIN"). Strive to provide.
         *   \`onCondition\`: The full JOIN condition.
         *   \`purpose\`: Why this join?

  **5. transformationRulesOrFunctionLogic (Optional Array):**
     *   For DML/SELECT: For EACH column in the SELECT list or each assignment in an UPDATE SET clause.
     *   For **User Defined Functions**: Detail the key calculation steps or logic units within the function body. Each step can be an item in this array.
     *   Fields:
         *   \`targetColumn\` (Optional): Final column name, updated column, variable, or a description for a function logic step (e.g., "Calculate Discounted Price", "Format Output String").
         *   \`transformationLogic\`: The exact SQL expression/logic snippet. For functions, this could be a significant line or block from the function body.
         *   \`description\`: Detailed explanation. For functions, explain what this part of the function's logic achieves.
         *   \`sourceColumns\` (Array, optional): Key source columns/variables involved.

  **6. filteringAndBusinessRules (Optional):** Detail all filtering *within the analyzed block/object*.
     *   \`whereClause\`, \`whereClauseExplanation\`, \`havingClause\`, \`havingClauseExplanation\`.
     *   \`detailedConditions\` (Array, optional): Breakdown of individual conditions.
     *   \`windowFunctions\` (Array, optional): Details of window functions.
     *   \`udfsOrProceduresUsedInFiltering\` (Array, optional): UDFs/Procs *called within* filtering logic. For each:
         *   Include 'name', 'usageContext', 'parametersPassed'.
         *   \`inferredPurpose\` (Optional): Briefly explain the UDF/Proc's likely purpose.
     *   \`otherImpliedBusinessRules\` (Array, optional): Broader business rules.
     *   Also consider IF/ELSE, temp tables, or procedural elements within the SQL that affect filtering or business rule application *for the analyzed block*.

  **7. outputFlow (Optional):** Describe the data journey *for the analyzed block/object*.
     *   \`textualRepresentation\` (Optional): A structured textual DAG like '[TYPE:Name] -> [OPERATION:Detail] -> [TYPE:Name]' (e.g., '[TABLE:Orders] -> [JOIN:Customers on o.CID=c.ID] -> [FILTER:IsActive=1] -> [AGG:SUM(Total)] -> [TARGET_TABLE:CustomerAggregates]'). Make operation details specific. For Views, "[SOURCES] -> [LOGIC] -> [VIEW_DEF:ViewName]". For Functions, "[FUNC_IN:Params] -> [LOGIC_STEPS] -> [FUNC_OUT:ReturnType]".
     *   \`dataSources\` (Optional Array): Primary originating data sources or function inputs.
     *   \`keyTransformationsInFlow\` (Optional Array): Major transformation stages or function logic steps identified in textualRepresentation.
     *   \`dataSink\` (Optional String): Where does final data go (target table/view name), or what is the function's output?

  **8. dependenciesAndCrossReferences (Optional):**
     *   \`externalObjectsCalledOrReferenced\` (Array, optional): List ALL UDFs, Stored Procedures, Views, Tables, etc., **explicitly called or referenced** from *within this SQL block/object*. For each:
         *   \`objectName\`, \`objectType\`, \`usageContext\` (e.g., "Function called in SELECT", "Table queried in FROM", "View joined", "Procedure executed EXEC ..."). Be very thorough here.
         *   \`inferredPurpose\` (Optional): Briefly describe the likely purpose of the referenced object.
     *   \`potentialLogicOverlaps\` (Array, optional): Hints of logic overlap with other (hypothetical/known) objects.

  **9. codeQualitySuggestions (Optional):**
     *   \`suggestions\` (Array): Suggestions based on the analyzed block. **Specifically look for and flag potential performance issues from implicit data type conversions in JOIN or WHERE clauses (use 'PerformanceWarning' type).**

  **10. overallLogicExplanationForJuniorDev (Optional String):**
      *   Final summary paragraph for a junior developer about the analyzed block.

  Be extremely thorough for the *single, primary block/object you are analyzing based on the \`blockType\` and \`sqlCode\` content*. Adhere strictly to the JSON output.
  `,
});

// --- Genkit Flow Definition ---
const explainSqlBlockFlow = ai.defineFlow(
  {
    name: 'explainSqlBlockFlow_v13', // Version bump
    inputSchema: ExplainSqlBlockInputSchema,
    outputSchema: ExplainSqlBlockOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input); 
    if (!output) {
        throw new Error("AI failed to generate the detailed SQL block explanation.");
    }
    // The wrapper function `explainSqlBlockDetailed` will handle robust default initializations.
    return output; 
  }
);

export { explainSqlBlockDetailed as explainLogicRules };
// DO NOT export the Zod schema constants like ExplainSqlBlockInputSchema or ExplainSqlBlockOutputSchema
// as they are not compatible with "use server" client boundaries.
    
    

    