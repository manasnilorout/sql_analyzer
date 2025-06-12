
// src/ai/flows/generate-sql-logical-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow to break down SQL code into a sequence of logical steps
 * suitable for visual representation as a flow diagram.
 *
 * - generateSqlLogicalFlow - A function that generates a structured list of logical flow steps from SQL code.
 * - GenerateSqlLogicalFlowInput - The input type for the generateSqlLogicalFlow function.
 * - GenerateSqlLogicalFlowOutput - The return type for the generateSqlLogicalFlow function.
 * - LogicalStep - The type for an individual step in the logical flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LogicalStepSchema = z.object({
  id: z.string().optional().describe("A unique identifier for this step, e.g., 'step-1', 'step-2a'. If not provided by AI, it will be auto-generated. AI should try to ensure it's unique within the flow."),
  title: z.string().optional().describe("A short, descriptive title for this logical step (e.g., 'Select Initial Customer Data', 'Filter Out Inactive Records', 'Join with Order Details Table'). Aim for action-oriented titles. If not provided by AI, a default will be assigned."),
  description: z.string().describe("A brief (1-2 sentences) explanation of what happens in this specific step of the SQL logic. Explain the purpose of this operation clearly for a junior developer."),
  sqlReference: z.string().optional().describe("A very brief, highly relevant SQL keyword, clause, or snippet from the original code that this step primarily refers to (e.g., 'FROM Customers', 'WHERE Status = 0', 'LEFT JOIN Orders o ON c.id = o.customer_id', 'GROUP BY ProductID', 'SUM(Quantity)'). Keep it concise."),
  type: z.enum([
    "DataRetrieval",    // SELECT ... FROM, VALUES
    "Filtering",        // WHERE, HAVING, DISTINCT (if used for filtering)
    "Joining",          // INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN, CROSS JOIN
    "Transformation",   // CASE statements, function calls (CONVERT, CAST, SUBSTRING, etc.), arithmetic operations
    "Aggregation",      // GROUP BY, aggregate functions (SUM, COUNT, AVG, MIN, MAX)
    "Sorting",          // ORDER BY
    "Modification",     // INSERT INTO, UPDATE, DELETE FROM, MERGE
    "CTEInitialization",// WITH ... AS (the definition part of a CTE)
    "CTEConsumption",   // When a CTE is used in a subsequent part of the query
    "SubqueryExecution",// Execution of a subquery
    "SetOperation",     // UNION, INTERSECT, EXCEPT
    "WindowFunction",   // ROW_NUMBER(), RANK() OVER (...)
    "ConditionalLogic", // IF/ELSE blocks in procedural SQL
    "VariableAssignment", // SET @var = ... or DECLARE @var ...
    "Output",           // The final SELECT that produces the result, or RETURN statement
    "Other"
  ]).describe("The primary type of SQL operation this step represents. Be as specific as possible."),
});
export type LogicalStep = z.infer<typeof LogicalStepSchema>;

const GenerateSqlLogicalFlowInputSchema = z.object({
  sqlCode: z.string().describe('The SQL code block to analyze.'),
  blockType: z.string().describe('The type of the SQL code block (e.g., stored procedure, view, function, SQL script).'),
});
export type GenerateSqlLogicalFlowInput = z.infer<typeof GenerateSqlLogicalFlowInputSchema>;

export const GenerateSqlLogicalFlowOutputSchema = z.object({ // Added export
  flowSteps: z.array(LogicalStepSchema).describe("An array of logical steps representing the SQL code's flow. The order of steps in the array should strictly correspond to the logical execution order or top-to-bottom reading of the SQL code. If the SQL contains multiple independent statements (e.g., in a script), represent them as a continuous sequence of steps in this single array, clearly delineating them if possible via step titles or descriptions."),
});
export type GenerateSqlLogicalFlowOutput = z.infer<typeof GenerateSqlLogicalFlowOutputSchema>;

export async function generateSqlLogicalFlow(input: GenerateSqlLogicalFlowInput): Promise<GenerateSqlLogicalFlowOutput> {
  return generateSqlLogicalFlowFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSqlLogicalFlowPrompt_v2', 
  input: {schema: GenerateSqlLogicalFlowInputSchema},
  output: {schema: GenerateSqlLogicalFlowOutputSchema},
  prompt: `You are an expert SQL analyst tasked with breaking down a SQL {{{blockType}}} into a sequence of clear, logical steps.
  Your goal is to create a structured representation that can be used to visualize the code's flow, making it understandable for a junior developer.
  The steps should follow the logical execution order of the SQL or its top-to-bottom structure.

  **CRITICAL: Process the entire SQL code provided, from beginning to end, without any truncation.** Ensure all statements and operations are represented in the \`flowSteps\`.

  SQL Code:
  \`\`\`sql
  {{{sqlCode}}}
  \`\`\`

  For each logical step you identify, provide the following details:
  - \`id\`: (Optional) A unique identifier string for the step (e.g., "step-1", "step-2", "step-2a"). It is highly desirable that you provide this. If omitted, one will be generated.
  - \`title\`: (Optional) A concise, action-oriented title for the step (e.g., "Fetch All Orders", "Filter by Order Date", "Calculate Total Sales per Product"). If omitted, a default title will be used.
  - \`description\`: A brief (1-2 sentences) explanation of what this step achieves and its purpose in plain language.
  - \`sqlReference\`: (Optional) A very short, relevant SQL keyword, clause, or snippet from the provided SQL that this step directly relates to (e.g., "FROM Orders", "WHERE OrderDate > '2023-01-01'", "LEFT JOIN Products", "SUM(Price)").
  - \`type\`: The primary SQL operation type for this step. Choose from the predefined enum: "DataRetrieval", "Filtering", "Joining", "Transformation", "Aggregation", "Sorting", "Modification", "CTEInitialization", "CTEConsumption", "SubqueryExecution", "SetOperation", "WindowFunction", "ConditionalLogic", "VariableAssignment", "Output", "Other".

  **Important Considerations**:
  *   **Order**: The \`flowSteps\` array must represent the sequence in which operations occur or are defined. For procedural SQL (like Stored Procedures with IF/DECLARE/SET), try to follow the control flow.
  *   **Granularity**: Break down complex queries into meaningful, distinct steps. For instance, a SELECT query might have separate steps for data retrieval (FROM), joining (JOIN), filtering (WHERE), aggregation (GROUP BY), and sorting (ORDER BY).
  *   **CTEs**: A CTE definition should be a "CTEInitialization" step. When the CTE is used later, that usage can be a "CTEConsumption" or "DataRetrieval" (from CTE) step.
  *   **Subqueries**: Treat subqueries as distinct steps ("SubqueryExecution"), explaining their purpose and how they feed into the outer query.
  *   **Multiple Statements**: If the input \`sqlCode\` contains multiple distinct SQL statements (e.g., a script with several commands separated by semicolons), represent them as a continuous sequence of steps in the single \`flowSteps\` array. Try to make it clear where one statement's logic ends and another's begins through step titles or descriptions if appropriate.
  *   **Clarity for Juniors**: All explanations should be easy for a junior developer to understand.

  Generate the \`flowSteps\` array. Ensure every logical operation or significant part of the SQL is covered by a step.
  Do not invent information not present in the SQL code.
  Adhere strictly to the JSON output schema.
  `,
});

const generateSqlLogicalFlowFlow = ai.defineFlow(
  {
    name: 'generateSqlLogicalFlowFlow_v2',
    inputSchema: GenerateSqlLogicalFlowInputSchema,
    outputSchema: GenerateSqlLogicalFlowOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.flowSteps) {
      // Fallback to an empty array if AI fails to produce steps
      return { flowSteps: [] };
    }
    // Ensure IDs and titles are present and IDs are unique.
    const processedSteps = output.flowSteps.map((step, index) => ({
        ...step,
        id: step.id || `step-${index + 1}-${Date.now()}`, // Ensure ID exists and is likely unique
        title: step.title || `Processing Step ${index + 1}` // Ensure title exists
    }));
    
    // Further ensure ID uniqueness based on the generated/provided IDs.
    const idCounts: Record<string, number> = {};
    const trulyUniqueSteps = processedSteps.map(step => {
        // Ensure step.id is a string before using it as a key
        const currentId = String(step.id);
        idCounts[currentId] = (idCounts[currentId] || 0) + 1;
        if (idCounts[currentId] > 1) {
            return {...step, id: `${currentId}_${idCounts[currentId] -1}`};
        }
        return step;
    });

    return { flowSteps: trulyUniqueSteps };
  }
);

