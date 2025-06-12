// src/ai/flows/analyze-sub-block.ts
'use server';

/**
 * @fileOverview Provides comprehensive analysis for sub-blocks including enhanced metadata and business purpose identification.
 *
 * - analyzeSubBlock - A function that provides comprehensive sub-block analysis.
 * - AnalyzeSubBlockInput - The input type for the analyzeSubBlock function.
 * - EnhancedSubBlockAnalysis - The return type for the analyzeSubBlock function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { BlockType } from '@shared/types/analysis';

const AnalyzeSubBlockInputSchema = z.object({
  code: z.string().describe('The SQL sub-block code to analyze.'),
  blockType: z.nativeEnum(BlockType).describe('The identified block type.'),
  parentContext: z.object({
    parentBlockType: z.string().describe('The type of the parent block.'),
    parentBlockCode: z.string().describe('The full parent block code for context.'),
    availableVariables: z.array(z.string()).describe('Variables available in the parent context.'),
    availableTables: z.array(z.string()).describe('Tables available in the parent context.')
  }).describe('Context information from the parent block.'),
  executionOrder: z.number().describe('The execution order of this sub-block within the parent.')
});
export type AnalyzeSubBlockInput = z.infer<typeof AnalyzeSubBlockInputSchema>;

export const EnhancedSubBlockAnalysisSchema = z.object({
  blockTitle: z.string().describe('A descriptive title indicating the purpose of this sub-block (e.g., "Parameter Validation", "Customer Data Retrieval", "Transaction Commit").'),
  blockExplanation: z.string().describe('A clear explanation of what this sub-block does and why it is needed in the context of the parent block.'),
  blockComplexity: z.enum(['simple', 'moderate', 'complex']).describe('Assessment of the sub-block complexity based on structure, logic depth, and dependencies.'),
  blockDependencies: z.array(z.string()).describe('List of variables, tables, or other sub-blocks that this block depends on.'),
  businessPurpose: z.string().optional().describe('The business logic or domain-specific purpose this sub-block serves (e.g., "Data Validation", "Audit Trail", "Performance Optimization").'),
  technicalDetails: z.object({
    primaryOperations: z.array(z.string()).describe('The main technical operations performed in this sub-block.'),
    dataTransformations: z.string().optional().describe('Description of any data transformations or manipulations.'),
    errorHandling: z.string().optional().describe('Description of error handling mechanisms if present.'),
    performanceConsiderations: z.array(z.string()).optional().describe('Performance-related aspects or potential optimizations.')
  }).describe('Technical details about the sub-block implementation.'),
  contextualInsights: z.object({
    relationshipToParent: z.string().describe('How this sub-block relates to and supports the overall parent block purpose.'),
    executionFlow: z.string().describe('When and under what conditions this sub-block executes.'),
    inputOutputFlow: z.string().optional().describe('What data flows into and out of this sub-block.')
  }).describe('Contextual insights about the sub-block role.'),
  qualityAssessment: z.object({
    codeQuality: z.enum(['excellent', 'good', 'fair', 'needs-improvement']).describe('Overall code quality assessment.'),
    maintainability: z.enum(['high', 'medium', 'low']).describe('How maintainable this code is.'),
    readability: z.enum(['high', 'medium', 'low']).describe('How readable this code is.'),
    suggestions: z.array(z.string()).optional().describe('Specific suggestions for improvement if applicable.')
  }).describe('Quality assessment of the sub-block code.')
});
export type EnhancedSubBlockAnalysis = z.infer<typeof EnhancedSubBlockAnalysisSchema>;

export async function analyzeSubBlock(input: AnalyzeSubBlockInput): Promise<EnhancedSubBlockAnalysis> {
  return analyzeSubBlockFlow(input);
}

const analyzeSubBlockPrompt = ai.definePrompt({
  name: 'analyzeSubBlockPrompt',
  input: {schema: AnalyzeSubBlockInputSchema},
  output: {schema: EnhancedSubBlockAnalysisSchema},
  prompt: `You are an expert SQL analyst specializing in sub-block analysis and business logic identification. Your task is to provide comprehensive analysis of SQL sub-blocks with enhanced metadata and business context.

**Sub-Block to Analyze:**
\`\`\`sql
{{code}}
\`\`\`

**Block Type:** {{blockType}}
**Execution Order:** {{executionOrder}}

**Parent Context:**
- **Parent Type:** {{parentContext.parentBlockType}}
- **Available Variables:** {{#each parentContext.availableVariables}}{{this}}, {{/each}}
- **Available Tables:** {{#each parentContext.availableTables}}{{this}}, {{/each}}

**Analysis Requirements:**

1. **Block Title**: Create a descriptive title that captures the specific purpose of this sub-block within its parent context.

2. **Block Explanation**: Provide a clear explanation of:
   - What this sub-block accomplishes
   - Why it's needed in the parent block context
   - How it contributes to the overall functionality

3. **Complexity Assessment**: Evaluate complexity based on:
   - **Simple**: Basic operations, minimal logic, few dependencies
   - **Moderate**: Some conditional logic, multiple operations, moderate dependencies
   - **Complex**: Advanced logic, nested structures, multiple dependencies, or sophisticated algorithms

4. **Dependencies**: Identify all dependencies including:
   - Variables from parent context that are used
   - Tables that are accessed
   - Other sub-blocks this depends on
   - External resources or functions

5. **Business Purpose**: Identify the business-domain purpose:
   - Data Validation, Audit Trail, Reporting, Calculation
   - Performance Optimization, Error Management, Data Synchronization
   - Business Rule Implementation, Workflow Step, etc.

6. **Technical Details**: Analyze the implementation:
   - Primary operations (SELECT, INSERT, calculations, etc.)
   - Data transformations or manipulations
   - Error handling mechanisms
   - Performance considerations

7. **Contextual Insights**: Provide context-aware analysis:
   - How this sub-block supports the parent block
   - When and under what conditions it executes
   - Data flow patterns

8. **Quality Assessment**: Evaluate code quality:
   - Overall code quality (structure, best practices)
   - Maintainability (how easy to modify/extend)
   - Readability (clarity and documentation)
   - Specific improvement suggestions

**Focus Areas for {{blockType}} Blocks:**
{{#switch blockType}}
  {{#case "declaration"}}
  - Variable/cursor declaration patterns
  - Initialization values and data types
  - Scope and lifecycle considerations
  {{/case}}
  {{#case "initialization"}}
  - Parameter validation logic
  - Default value assignments
  - Environment setup patterns
  {{/case}}
  {{#case "business_logic"}}
  - Business rule implementation
  - Domain-specific calculations
  - Workflow step execution
  {{/case}}
  {{#case "transaction"}}
  - Transaction boundary management
  - Data consistency requirements
  - Rollback and commit strategies
  {{/case}}
  {{#case "loop"}}
  - Iteration patterns and conditions
  - Loop body operations
  - Performance and termination logic
  {{/case}}
  {{#case "conditional"}}
  - Condition evaluation logic
  - Branch execution paths
  - Decision tree complexity
  {{/case}}
  {{#case "error_handling"}}
  - Exception handling patterns
  - Error recovery mechanisms
  - Logging and notification strategies
  {{/case}}
  {{#case "data_operation"}}
  - Data manipulation operations
  - Query optimization patterns
  - Data integrity considerations
  {{/case}}
  {{#case "calculation"}}
  - Mathematical operations
  - Aggregation patterns
  - Window function usage
  {{/case}}
  {{#case "cleanup"}}
  - Resource cleanup patterns
  - Memory management
  - Finalization operations
  {{/case}}
{{/switch}}

Provide thorough, accurate analysis that helps developers understand both the technical implementation and business context of this sub-block.`
});

const analyzeSubBlockFlow = ai.defineFlow(
  {
    name: 'analyzeSubBlockFlow',
    inputSchema: AnalyzeSubBlockInputSchema,
    outputSchema: EnhancedSubBlockAnalysisSchema,
  },
  async input => {
    const {output} = await analyzeSubBlockPrompt(input);
    // Ensure all fields are properly initialized
    return {
      blockTitle: output?.blockTitle || 'Sub-Block',
      blockExplanation: output?.blockExplanation || 'Analysis not available.',
      blockComplexity: output?.blockComplexity || 'moderate',
      blockDependencies: output?.blockDependencies || [],
      businessPurpose: output?.businessPurpose,
      technicalDetails: {
        primaryOperations: output?.technicalDetails?.primaryOperations || [],
        dataTransformations: output?.technicalDetails?.dataTransformations,
        errorHandling: output?.technicalDetails?.errorHandling,
        performanceConsiderations: output?.technicalDetails?.performanceConsiderations || []
      },
      contextualInsights: {
        relationshipToParent: output?.contextualInsights?.relationshipToParent || 'Relationship not determined.',
        executionFlow: output?.contextualInsights?.executionFlow || 'Execution flow not determined.',
        inputOutputFlow: output?.contextualInsights?.inputOutputFlow
      },
      qualityAssessment: {
        codeQuality: output?.qualityAssessment?.codeQuality || 'good',
        maintainability: output?.qualityAssessment?.maintainability || 'medium',
        readability: output?.qualityAssessment?.readability || 'medium',
        suggestions: output?.qualityAssessment?.suggestions || []
      }
    };
  }
);

export { analyzeSubBlockFlow };