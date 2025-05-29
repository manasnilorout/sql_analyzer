// src/ai/flows/summarize-entire-script.ts
'use server';
/**
 * @fileOverview A Genkit flow to generate a high-level summary for an entire SQL script.
 *
 * - summarizeEntireSqlScript - A function that summarizes the entire SQL script.
 * - SummarizeEntireScriptInput - The input type.
 * - SummarizeEntireScriptOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeEntireScriptInputSchema = z.object({
  fullSqlCode: z.string().describe('The entire SQL script content to summarize.'),
});
export type SummarizeEntireScriptInput = z.infer<typeof SummarizeEntireScriptInputSchema>;

const SummarizeEntireScriptOutputSchema = z.object({
  overallSummary: z.string().describe('A high-level summary of the entire SQL script, outlining its main purpose, key operations, and general data flow.'),
});
export type SummarizeEntireScriptOutput = z.infer<typeof SummarizeEntireScriptOutputSchema>;

export async function summarizeEntireSqlScript(input: SummarizeEntireScriptInput): Promise<SummarizeEntireScriptOutput> {
  return summarizeEntireScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeEntireScriptPrompt',
  input: {schema: SummarizeEntireScriptInputSchema},
  output: {schema: SummarizeEntireScriptOutputSchema},
  prompt: `You are an expert SQL analyst. Provide a high-level summary for the following SQL script.
  The summary should cover:
  1.  The overall purpose of the script.
  2.  The main types of operations or logical blocks it contains (e.g., creating views, inserting data, updating records, defining procedures).
  3.  A general idea of the data flow if discernible.
  4.  Keep the summary concise and suitable for an overview.

  SQL Script:
  \`\`\`sql
  {{{fullSqlCode}}}
  \`\`\`
  `,
});

const summarizeEntireScriptFlow = ai.defineFlow(
  {
    name: 'summarizeEntireScriptFlow',
    inputSchema: SummarizeEntireScriptInputSchema,
    outputSchema: SummarizeEntireScriptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        return { overallSummary: "Could not generate an overall summary for the script." };
    }
    return output;
  }
);
