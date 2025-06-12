// src/ai/flows/extract-table-info.ts
'use server';

/**
 * @fileOverview A Genkit flow to extract and describe all tables involved in SQL code,
 * detailing their primary role and operations.
 *
 * - extractTableInfo - A function that identifies tables and their roles.
 * - ExtractTableInfoInput - The input type for the extractTableInfo function.
 * - ExtractTableInfoOutput - The return type for the extractTableInfo function.
 * - IdentifiedTable - The type for an individual identified table.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const IdentifiedTableSchema = z.object({
  name: z.string().describe('The full name of the table (e.g., schema.tablename).'),
  primaryRole: z.enum(["Source", "Target", "SourceAndTarget", "Mentioned"])
    .describe('The primary role of this table in the SQL block. "SourceAndTarget" if it\'s both read from and written to (e.g., in an UPDATE or MERGE). "Mentioned" for lookups or less direct involvement.'),
  roleDescription: z.string().describe('A concise (1-2 sentences) description of *how this specific table is used in this particular SQL code*. For example: "Serves as the primary source for customer address information.", "Receives newly calculated sales summary data.", "Is updated to reflect current inventory levels after a sale (also used to lookup current levels).", "Used as a lookup in a subquery to get product names."'),
  operations: z.array(z.string()).describe('Specific operations performed on this table (e.g., "SELECT FROM (Primary Source)", "INSERT INTO (Target)", "UPDATE (Target)", "JOIN ON (Lookup)", "MERGE (Target)", "MERGE (Source for join)"). Be specific about the DML or query part.'),
});
export type IdentifiedTable = z.infer<typeof IdentifiedTableSchema>;

const ExtractTableInfoInputSchema = z.object({
  sqlCode: z.string().describe('The SQL code block to analyze for table information.'),
  blockType: z.string().describe('The type of the SQL code block (e.g., stored procedure, view, function). This is a hint for the AI.'),
});
export type ExtractTableInfoInput = z.infer<typeof ExtractTableInfoInputSchema>;

export const ExtractTableInfoOutputSchema = z.object({ // Added export
  identifiedTables: z.array(IdentifiedTableSchema).describe('A comprehensive list of all unique tables identified in the SQL code, with their roles and operations.'),
});
export type ExtractTableInfoOutput = z.infer<typeof ExtractTableInfoOutputSchema>;

export async function extractTableInfo(input: ExtractTableInfoInput): Promise<ExtractTableInfoOutput> {
  const result = await extractTableInfoFlow(input);
  return {
    identifiedTables: (result.identifiedTables || []).map(table => ({
        name: table.name || "Unknown Table",
        primaryRole: table.primaryRole || "Mentioned",
        roleDescription: table.roleDescription || "Role not specified.",
        operations: table.operations || [],
    }))
  };
}

const prompt = ai.definePrompt({
  name: 'extractTableInfoPrompt_v2',
  input: {schema: ExtractTableInfoInputSchema},
  output: {schema: ExtractTableInfoOutputSchema},
  prompt: `You are an expert SQL analyzer. Given the following SQL code block (hinted as a '{{{blockType}}}'), your task is to identify ALL unique tables involved.
  For each unique table, provide its full name, its primary role in this specific SQL block, a detailed description of how it's used, and list the specific operations performed on it.

  SQL Code:
  \`\`\`sql
  {{{sqlCode}}}
  \`\`\`

  For each table, provide:
  1.  'name': The full table name (e.g., schema.MyTable, dbo.Orders). If a schema is not obvious, just use the table name.
  2.  'primaryRole': Classify the table's main role:
      *   "Source": Primarily read from (e.g., main table in FROM, JOINed for reading).
      *   "Target": Primarily written to (e.g., INSERT INTO, UPDATE target, DELETE FROM target, MERGE target).
      *   "SourceAndTarget": If the table is both a target of a DML operation AND also read from as a source in the same statement (e.g., UPDATE MyTable SET col = T2.val FROM MyTable T1 JOIN OtherTable T2 ON T1.id = T2.id, or in a MERGE statement).
      *   "Mentioned": If referenced in a less direct way (e.g., in a subquery for lookup, EXISTS clause, or complex JOIN where its role isn't purely source/target).
  3.  'roleDescription': A concise (1-2 sentences) explanation of *how this specific table is utilized in this particular SQL code*. Be specific. For example: "Primary source of order transaction data.", "Target for customer sales summary; updated based on aggregated daily sales.", "Provides product category lookups for enrichment.", "Used as both source and target in a MERGE statement to synchronize inventory."
  4.  'operations': A list of specific SQL operations performed on this table within the given code. Examples: ["SELECT FROM (Source)", "INSERT INTO (Target)", "UPDATE (Target)", "JOIN ON (Source for lookup)", "DELETE FROM (Target)", "MERGE (Target)", "MERGE (Source in JOIN)"].

  If a table is aliased, use its actual name.
  Be precise and focus only on the tables and their roles *within the provided SQL code*.
  If no tables are clearly identifiable (e.g., SELECT 1), return an empty array for 'identifiedTables'.
  Ensure 'identifiedTables' contains all unique tables found. Do not duplicate table entries; consolidate information if a table appears in multiple contexts.
  `,
});

const extractTableInfoFlow = ai.defineFlow(
  {
    name: 'extractTableInfoFlow_v2',
    inputSchema: ExtractTableInfoInputSchema,
    outputSchema: ExtractTableInfoOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return {
      identifiedTables: output?.identifiedTables || [],
    };
  }
);

// DO NOT export the Zod schema constants like ExtractTableInfoInputSchema
// as they are not compatible with "use server" client boundaries.
