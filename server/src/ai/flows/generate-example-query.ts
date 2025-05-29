// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview A Genkit flow to generate an example query based on the selected SQL code block.
 *
 * - generateExampleQuery - A function that generates an example query for a given SQL code block.
 * - GenerateExampleQueryInput - The input type for the generateExampleQuery function.
 * - GenerateExampleQueryOutput - The return type for the generateExampleQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateExampleQueryInputSchema = z.object({
  sqlCode: z.string().describe('The SQL code block to generate an example query for.'),
});
export type GenerateExampleQueryInput = z.infer<typeof GenerateExampleQueryInputSchema>;

const GenerateExampleQueryOutputSchema = z.object({
  exampleQuery: z.string().describe('The generated example query.'),
});
export type GenerateExampleQueryOutput = z.infer<typeof GenerateExampleQueryOutputSchema>;

export async function generateExampleQuery(input: GenerateExampleQueryInput): Promise<GenerateExampleQueryOutput> {
  return generateExampleQueryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateExampleQueryPrompt',
  input: {schema: GenerateExampleQueryInputSchema},
  output: {schema: GenerateExampleQueryOutputSchema},
  prompt: `You are an expert SQL developer.

  Generate an example query based on the following SQL code block. The example query should demonstrate how to use the code and what the result looks like.

  SQL code block:
  {{sqlCode}}

  Example query:`,
});

const generateExampleQueryFlow = ai.defineFlow(
  {
    name: 'generateExampleQueryFlow',
    inputSchema: GenerateExampleQueryInputSchema,
    outputSchema: GenerateExampleQueryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
