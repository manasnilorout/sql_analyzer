// src/ai/flows/summarize-code-block.ts
'use server';

/**
 * @fileOverview Summarizes a given SQL code block using GenAI, providing a structured and detailed explanation.
 *
 * - summarizeCodeBlock - A function that summarizes the code block.
 * - SummarizeCodeBlockInput - The input type for the summarizeCodeBlock function.
 * - SummarizeCodeBlockOutput - The return type for the summarizeCodeBlock function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeCodeBlockInputSchema = z.object({
  code: z.string().describe('The SQL code block to summarize.'),
  blockType: z.string().describe('The type of the SQL code block (e.g., stored procedure, view, function, or a second-level type like BEGIN_END_BLOCK).'),
  partitionDetail: z.object({
    level: z.enum(['first', 'second']),
    type: z.string().optional().describe('The specific type of the partition, especially for second-level (e.g., IF_BLOCK, WHILE_LOOP).')
  }).optional().describe('Details about the partition level and type, if applicable.')
});
export type SummarizeCodeBlockInput = z.infer<typeof SummarizeCodeBlockInputSchema>;

const CoreConceptSchema = z.object({
  concept: z.string().describe('The name of the SQL concept (e.g., "INNER JOIN", "CTE", "Window Function").'),
  explanation: z.string().describe('A brief, easy-to-understand explanation of the concept as used in the code, aimed at a junior developer.'),
  codeExample: z.string().optional().describe('A very short (1-2 lines), relevant snippet from the provided SQL code that clearly illustrates this concept. If no concise example can be extracted, omit this field.')
});

const SummarizeCodeBlockOutputSchema = z.object({
  mainPurpose: z.string().describe('A clear, concise statement (1-2 sentences) of the overall goal of this SQL {{{blockType}}}. What problem does it solve or what task does it perform?'),
  keyOperations: z.array(z.string()).describe('A bullet-point list of 3-5 primary actions or steps the code performs (e.g., "Filters data based on specific criteria", "Aggregates sales totals by product category", "Updates customer records with new information").'),
  dataFlow: z.string().describe('A brief explanation (1-2 sentences) of where the data primarily comes from and where it goes, or what it transforms into. (e.g., "Reads from `orders` and `products` tables, calculates total sales per product, and outputs a summarized result.").'),
  coreSqlConcepts: z.array(CoreConceptSchema).describe('An array identifying 2-3 key SQL concepts or techniques a junior developer can learn from this code. Focus on what is most prominent or illustrative in this specific example. Provide practical explanations.'),
  businessLogicInsights: z.array(z.string()).optional().describe('A few bullet points inferring potential business rules or objectives reflected in the SQL logic (e.g., "The logic to exclude inactive customers suggests a business rule to focus on active clientele."). Phrase these as observations and be specific to the code.'),
  beginnerFriendlyTips: z.array(z.string()).optional().describe('2-3 actionable tips or points of attention for a junior developer reviewing this specific code (e.g., "Notice how table aliases (`o`, `p`) make the query shorter and easier to read.", "The `WHERE` clause conditions are crucial for understanding the data subset being processed.").'),
});
export type SummarizeCodeBlockOutput = z.infer<typeof SummarizeCodeBlockOutputSchema>;

export async function summarizeCodeBlock(input: SummarizeCodeBlockInput): Promise<SummarizeCodeBlockOutput> {
  return summarizeCodeBlockFlow(input);
}

const summarizeCodeBlockPrompt = ai.definePrompt({
  name: 'summarizeCodeBlockPrompt',
  input: {schema: SummarizeCodeBlockInputSchema},
  output: {schema: SummarizeCodeBlockOutputSchema},
  prompt: `You are an expert SQL code summarizer tasked with explaining code to junior developers in a structured and insightful way.
  {{#if partitionDetail}}
  This is a {{partitionDetail.level}}-level partition.
  {{#if partitionDetail.type}}
  The specific type of this partition is '{{partitionDetail.type}}'.
  Focus your analysis on this specific block and its role within its parent context (if applicable for second-level).
  {{/if}}
  {{/if}}
  Analyze the following SQL code block (of type '{{{blockType}}}') and provide a detailed breakdown according to the specified output schema.

  SQL Code Block Type (for context of this specific analysis): {{{blockType}}}
  SQL Code:
  \`\`\`sql
  {{{code}}}
  \`\`\`

  Please populate the following fields in your response:

  - \`mainPurpose\`: A clear, concise statement (1-2 sentences) of the overall goal of this SQL {{{blockType}}}.
  - \`keyOperations\`: A bullet-point list of 3-5 primary actions or steps the code performs.
  - \`dataFlow\`: A brief explanation (1-2 sentences) of where the data primarily comes from and where it goes, or what it transforms into.
  - \`coreSqlConcepts\`: Identify 2-3 key SQL concepts or techniques a junior developer can learn from this code. For each concept:
      - \`concept\`: The name of the SQL concept (e.g., "INNER JOIN", "CTE", "Window Function").
      - \`explanation\`: A brief, easy-to-understand explanation of the concept *as it is used in this code*.
      - \`codeExample\`: (Optional) A very short (1-2 lines), relevant snippet from the provided SQL code that clearly illustrates this concept. If a concise example is not readily available or would be too long, omit this.
  - \`businessLogicInsights\`: (Optional) A few bullet points inferring potential business rules or objectives reflected in the SQL logic. Be specific to the patterns in the code.
  - \`beginnerFriendlyTips\`: (Optional) 2-3 actionable tips or points of attention for a junior developer reviewing *this specific* code.

  Ensure your explanations are tailored for someone learning SQL and highlight practical aspects from the provided code. Avoid overly generic descriptions.
  Focus on clarity, insight, and educational value.
  `,
});

const summarizeCodeBlockFlow = ai.defineFlow(
  {
    name: 'summarizeCodeBlockFlow',
    inputSchema: SummarizeCodeBlockInputSchema,
    outputSchema: SummarizeCodeBlockOutputSchema,
  },
  async input => {
    const {output} = await summarizeCodeBlockPrompt(input);
    // Ensure arrays are initialized if the LLM omits them
    return {
        mainPurpose: output?.mainPurpose || "Summary not available.",
        keyOperations: output?.keyOperations || [],
        dataFlow: output?.dataFlow || "Data flow information not available.",
        coreSqlConcepts: output?.coreSqlConcepts || [],
        businessLogicInsights: output?.businessLogicInsights || [],
        beginnerFriendlyTips: output?.beginnerFriendlyTips || [],
    };
  }
);

