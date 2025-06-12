import { BlockType, SharedSecondLevelPartition } from '@shared/types/analysis';
import { BlockClassificationEngine, BlockContext, ClassificationResult } from './BlockClassificationEngine';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface BlockParsingContext {
  parentBlockType: string;
  parentBlockCode: string;
  currentNestingLevel: number;
  availableVariables: string[];
  availableTables: string[];
  executionHistory: string[];
}

interface CodeBlock {
  code: string;
  startLine: number;
  endLine: number;
  type?: BlockType;
  classification?: ClassificationResult;
}

export class EnhancedSqlParser {
  private classificationEngine: BlockClassificationEngine;
  private executionOrder: number = 0;

  constructor() {
    this.classificationEngine = new BlockClassificationEngine();
  }

  parseWithContext(sql: string, context: BlockParsingContext): SharedSecondLevelPartition[] {
    try {
      this.executionOrder = 0;
      const codeBlocks = this.identifyCodeBlocks(sql);
      const enhancedBlocks = this.enhanceWithClassification(codeBlocks, context);
      
      return enhancedBlocks.map(block => this.convertToSharedPartition(block, context));
    } catch (error) {
      logger.error('Error parsing SQL with context:', error);
      return [];
    }
  }

  private identifyCodeBlocks(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    // Enhanced block identification combining multiple strategies
    const declarationBlocks = this.identifyDeclarationBlocks(sql);
    const initializationBlocks = this.identifyInitializationBlocks(sql);
    const transactionBlocks = this.identifyTransactionBoundaries(sql);
    const businessLogicGroups = this.identifyBusinessLogicGroups(sql);
    const dataOperationBlocks = this.identifyDataOperationBlocks(sql);
    const conditionalBlocks = this.identifyConditionalBlocks(sql);
    const loopBlocks = this.identifyLoopBlocks(sql);
    const errorHandlingBlocks = this.identifyErrorHandlingBlocks(sql);
    const calculationBlocks = this.identifyCalculationBlocks(sql);
    const cleanupBlocks = this.identifyCleanupBlocks(sql);

    // Combine all blocks and sort by start position
    const allBlocks = [
      ...declarationBlocks,
      ...initializationBlocks,
      ...transactionBlocks,
      ...businessLogicGroups,
      ...dataOperationBlocks,
      ...conditionalBlocks,
      ...loopBlocks,
      ...errorHandlingBlocks,
      ...calculationBlocks,
      ...cleanupBlocks
    ];

    // Remove overlapping blocks and ensure proper boundaries
    return this.resolveOverlappingBlocks(allBlocks);
  }

  identifyDeclarationBlocks(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    let currentBlock: string[] = [];
    let startLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      
      if (line.startsWith('DECLARE') || line.includes('CURSOR FOR')) {
        if (currentBlock.length === 0) {
          startLine = i + 1;
        }
        currentBlock.push(lines[i]);
      } else if (currentBlock.length > 0 && !line.startsWith('--') && line.length > 0) {
        // End of declaration block
        blocks.push({
          code: currentBlock.join('\n'),
          startLine,
          endLine: i,
          type: BlockType.DECLARATION
        });
        currentBlock = [];
        startLine = -1;
      }
    }
    
    // Handle final block
    if (currentBlock.length > 0) {
      blocks.push({
        code: currentBlock.join('\n'),
        startLine,
        endLine: lines.length,
        type: BlockType.DECLARATION
      });
    }
    
    return blocks;
  }

  identifyInitializationBlocks(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    const initPatterns = [
      /SET\s+(NOCOUNT|XACT_ABORT)/i,
      /SET\s+@\w+\s*=/i,
      /SELECT\s+@\w+\s*=/i,
      /IF\s+@\w+\s+IS\s+NULL.*RAISERROR/i
    ];
    
    let currentBlock: string[] = [];
    let startLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (initPatterns.some(pattern => pattern.test(line))) {
        if (currentBlock.length === 0) {
          startLine = i + 1;
        }
        currentBlock.push(lines[i]);
      } else if (currentBlock.length > 0 && line.length > 0 && !line.startsWith('--')) {
        // Check if this line continues the initialization block
        if (line.toUpperCase().includes('RETURN') || 
            !line.toUpperCase().startsWith('SET') && 
            !line.toUpperCase().startsWith('SELECT') &&
            !line.toUpperCase().startsWith('IF')) {
          blocks.push({
            code: currentBlock.join('\n'),
            startLine,
            endLine: i,
            type: BlockType.INITIALIZATION
          });
          currentBlock = [];
          startLine = -1;
        } else {
          currentBlock.push(lines[i]);
        }
      }
    }
    
    if (currentBlock.length > 0) {
      blocks.push({
        code: currentBlock.join('\n'),
        startLine,
        endLine: lines.length,
        type: BlockType.INITIALIZATION
      });
    }
    
    return blocks;
  }

  identifyBusinessLogicGroups(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    // Group related business operations
    let currentBlock: string[] = [];
    let startLine = -1;
    let currentContext = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();
      
      // Identify business logic patterns
      const businessPatterns = [
        'VALIDATION',
        'CALCULATE',
        'PROCESS',
        'GENERATE',
        'AGGREGATE',
        'SUMMARIZE'
      ];
      
      const isBusinessLogic = businessPatterns.some(pattern => 
        upperLine.includes(pattern) || 
        line.includes('Business') || 
        line.includes('Logic')
      );
      
      if (isBusinessLogic) {
        if (currentBlock.length === 0) {
          startLine = i + 1;
          currentContext = upperLine;
        }
        currentBlock.push(lines[i]);
      } else if (currentBlock.length > 0 && 
                 (upperLine.startsWith('SELECT') || 
                  upperLine.startsWith('INSERT') || 
                  upperLine.startsWith('UPDATE') || 
                  upperLine.startsWith('DELETE'))) {
        // Include related data operations
        currentBlock.push(lines[i]);
      } else if (currentBlock.length > 0 && line.length > 0 && !line.startsWith('--')) {
        // End of business logic group
        blocks.push({
          code: currentBlock.join('\n'),
          startLine,
          endLine: i,
          type: BlockType.BUSINESS_LOGIC
        });
        currentBlock = [];
        startLine = -1;
      }
    }
    
    if (currentBlock.length > 0) {
      blocks.push({
        code: currentBlock.join('\n'),
        startLine,
        endLine: lines.length,
        type: BlockType.BUSINESS_LOGIC
      });
    }
    
    return blocks;
  }

  identifyTransactionBoundaries(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    let currentBlock: string[] = [];
    let startLine = -1;
    let transactionDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      
      if (line.includes('BEGIN TRAN') || line.includes('BEGIN TRANSACTION')) {
        if (currentBlock.length === 0) {
          startLine = i + 1;
        }
        currentBlock.push(lines[i]);
        transactionDepth++;
      } else if (line.includes('COMMIT') || line.includes('ROLLBACK')) {
        currentBlock.push(lines[i]);
        transactionDepth--;
        
        if (transactionDepth <= 0) {
          blocks.push({
            code: currentBlock.join('\n'),
            startLine,
            endLine: i + 1,
            type: BlockType.TRANSACTION
          });
          currentBlock = [];
          startLine = -1;
          transactionDepth = 0;
        }
      } else if (currentBlock.length > 0) {
        currentBlock.push(lines[i]);
      }
    }
    
    return blocks;
  }

  identifyDataOperationBlocks(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    const dataOpPatterns = [
      /SELECT\s+/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /DELETE\s+FROM/i,
      /MERGE\s+/i,
      /WITH\s+\w+\s+AS/i
    ];
    
    let currentBlock: string[] = [];
    let startLine = -1;
    let parenDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (dataOpPatterns.some(pattern => pattern.test(line))) {
        if (currentBlock.length === 0) {
          startLine = i + 1;
        }
        currentBlock.push(lines[i]);
        parenDepth += (line.match(/\(/g) || []).length;
        parenDepth -= (line.match(/\)/g) || []).length;
      } else if (currentBlock.length > 0) {
        currentBlock.push(lines[i]);
        parenDepth += (line.match(/\(/g) || []).length;
        parenDepth -= (line.match(/\)/g) || []).length;
        
        // End block if we've closed all parentheses and hit a statement terminator
        if (parenDepth <= 0 && (line.trim().endsWith(';') || 
            (i + 1 < lines.length && lines[i + 1].trim().toUpperCase().match(/^(SELECT|INSERT|UPDATE|DELETE|WITH|IF|WHILE|BEGIN|END|DECLARE)/))
          )) {
          blocks.push({
            code: currentBlock.join('\n'),
            startLine,
            endLine: i + 1,
            type: BlockType.DATA_OPERATION
          });
          currentBlock = [];
          startLine = -1;
          parenDepth = 0;
        }
      }
    }
    
    if (currentBlock.length > 0) {
      blocks.push({
        code: currentBlock.join('\n'),
        startLine,
        endLine: lines.length,
        type: BlockType.DATA_OPERATION
      });
    }
    
    return blocks;
  }

  identifyConditionalBlocks(sql: string): CodeBlock[] {
    return this.identifyStructuralBlocks(sql, [
      { start: /IF\s+/i, end: /END\s*$/i, type: BlockType.CONDITIONAL },
      { start: /CASE\s+/i, end: /END\s*$/i, type: BlockType.CONDITIONAL }
    ]);
  }

  identifyLoopBlocks(sql: string): CodeBlock[] {
    return this.identifyStructuralBlocks(sql, [
      { start: /WHILE\s+/i, end: /END\s*$/i, type: BlockType.LOOP }
    ]);
  }

  identifyErrorHandlingBlocks(sql: string): CodeBlock[] {
    return this.identifyStructuralBlocks(sql, [
      { start: /BEGIN\s+TRY/i, end: /END\s+CATCH/i, type: BlockType.ERROR_HANDLING }
    ]);
  }

  identifyCalculationBlocks(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    const calcPatterns = [
      /SUM\s*\(/i,
      /COUNT\s*\(/i,
      /AVG\s*\(/i,
      /MAX\s*\(/i,
      /MIN\s*\(/i,
      /@\w+\s*=\s*.*[\+\-\*\/]/i,
      /OVER\s*\(/i,
      /ROW_NUMBER\s*\(/i
    ];
    
    let currentBlock: string[] = [];
    let startLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (calcPatterns.some(pattern => pattern.test(line))) {
        if (currentBlock.length === 0) {
          startLine = i + 1;
        }
        currentBlock.push(lines[i]);
      } else if (currentBlock.length > 0 && line.length > 0 && !line.startsWith('--')) {
        // Continue if it's a related calculation line
        if (line.includes('FROM') || line.includes('WHERE') || line.includes('GROUP BY') || 
            line.includes('ORDER BY') || line.includes('HAVING')) {
          currentBlock.push(lines[i]);
        } else {
          blocks.push({
            code: currentBlock.join('\n'),
            startLine,
            endLine: i,
            type: BlockType.CALCULATION
          });
          currentBlock = [];
          startLine = -1;
        }
      }
    }
    
    if (currentBlock.length > 0) {
      blocks.push({
        code: currentBlock.join('\n'),
        startLine,
        endLine: lines.length,
        type: BlockType.CALCULATION
      });
    }
    
    return blocks;
  }

  identifyCleanupBlocks(sql: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    const cleanupPatterns = [
      /DROP\s+TABLE\s+#/i,
      /CLOSE\s+\w+/i,
      /DEALLOCATE\s+\w+/i,
      /RETURN\s*$/i,
      /SET\s+@\w+\s*=\s*NULL/i
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (cleanupPatterns.some(pattern => pattern.test(line))) {
        blocks.push({
          code: line,
          startLine: i + 1,
          endLine: i + 1,
          type: BlockType.CLEANUP
        });
      }
    }
    
    return blocks;
  }

  private identifyStructuralBlocks(sql: string, patterns: { start: RegExp; end: RegExp; type: BlockType }[]): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = sql.split('\n');
    
    patterns.forEach(({ start, end, type }) => {
      let currentBlock: string[] = [];
      let startLine = -1;
      let depth = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (start.test(line)) {
          if (currentBlock.length === 0) {
            startLine = i + 1;
          }
          currentBlock.push(lines[i]);
          depth++;
        } else if (currentBlock.length > 0) {
          currentBlock.push(lines[i]);
          
          if (end.test(line)) {
            depth--;
            if (depth <= 0) {
              blocks.push({
                code: currentBlock.join('\n'),
                startLine,
                endLine: i + 1,
                type
              });
              currentBlock = [];
              startLine = -1;
              depth = 0;
            }
          }
        }
      }
    });
    
    return blocks;
  }

  private resolveOverlappingBlocks(blocks: CodeBlock[]): CodeBlock[] {
    // Sort blocks by start line
    blocks.sort((a, b) => a.startLine - b.startLine);
    
    const resolvedBlocks: CodeBlock[] = [];
    
    for (const block of blocks) {
      const lastBlock = resolvedBlocks[resolvedBlocks.length - 1];
      
      if (!lastBlock || block.startLine >= lastBlock.endLine) {
        // No overlap, add the block
        resolvedBlocks.push(block);
      } else if (block.endLine > lastBlock.endLine) {
        // Partial overlap, merge or choose the more specific one
        if (this.isMoreSpecificBlock(block.type!, lastBlock.type!)) {
          resolvedBlocks[resolvedBlocks.length - 1] = block;
        }
      }
      // Complete overlap - keep the existing block
    }
    
    return resolvedBlocks;
  }

  private isMoreSpecificBlock(type1: BlockType, type2: BlockType): boolean {
    // Define hierarchy of block specificity
    const specificity: Record<BlockType, number> = {
      [BlockType.DECLARATION]: 9,
      [BlockType.INITIALIZATION]: 8,
      [BlockType.TRANSACTION]: 7,
      [BlockType.ERROR_HANDLING]: 6,
      [BlockType.LOOP]: 5,
      [BlockType.CONDITIONAL]: 4,
      [BlockType.CALCULATION]: 3,
      [BlockType.DATA_OPERATION]: 2,
      [BlockType.CLEANUP]: 1,
      [BlockType.BUSINESS_LOGIC]: 0
    };
    
    return specificity[type1] > specificity[type2];
  }

  private enhanceWithClassification(blocks: CodeBlock[], context: BlockParsingContext): CodeBlock[] {
    return blocks.map(block => {
      const blockContext: BlockContext = {
        parentBlockType: context.parentBlockType,
        parentBlockCode: context.parentBlockCode,
        currentNestingLevel: context.currentNestingLevel,
        availableVariables: context.availableVariables,
        availableTables: context.availableTables,
        executionHistory: context.executionHistory
      };
      
      const classification = this.classificationEngine.classifyBlock(block.code, blockContext);
      
      return {
        ...block,
        type: classification.type,
        classification
      };
    });
  }

  private convertToSharedPartition(block: CodeBlock, context: BlockParsingContext): SharedSecondLevelPartition {
    const classification = block.classification!;
    
    return {
      // Existing fields
      code: block.code,
      type: block.type!,
      startLine: block.startLine,
      endLine: block.endLine,
      summary: null,
      detailedExplanation: null,
      
      // New required fields
      blockTitle: classification.title,
      blockSqlSnippet: block.code,
      blockExplanation: classification.explanation,
      blockComplexity: classification.complexity,
      blockDependencies: classification.dependencies,
      blockLineStart: block.startLine,
      blockLineEnd: block.endLine,
      
      // New optional fields
      tableInfo: null,
      logicalFlowSteps: null,
      
      // New metadata fields
      parentBlockContext: context.parentBlockType,
      executionOrder: ++this.executionOrder,
      hasNestedBlocks: this.hasNestedStructures(block.code),
      businessPurpose: classification.businessPurpose
    };
  }

  private hasNestedStructures(code: string): boolean {
    const nestedPatterns = [
      /BEGIN.*BEGIN/is,
      /IF.*IF/is,
      /WHILE.*WHILE/is,
      /CASE.*CASE/is,
      /SELECT.*SELECT/is
    ];
    
    return nestedPatterns.some(pattern => pattern.test(code.toUpperCase()));
  }
}