import { BlockType } from '@shared/types/analysis';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface BlockContext {
  parentBlockType: string;
  parentBlockCode: string;
  currentNestingLevel: number;
  availableVariables: string[];
  availableTables: string[];
  executionHistory: string[];
}

export interface ClassificationResult {
  type: BlockType;
  title: string;
  explanation: string;
  complexity: 'simple' | 'moderate' | 'complex';
  dependencies: string[];
  businessPurpose?: string;
}

export class BlockClassificationEngine {
  
  classifyBlock(code: string, context: BlockContext): ClassificationResult {
    const normalizedCode = this.normalizeCode(code);
    const type = this.determineBlockType(normalizedCode, context);
    
    return {
      type,
      title: this.determineBlockTitle(normalizedCode, type),
      explanation: this.generateBlockExplanation(normalizedCode, type),
      complexity: this.calculateBlockComplexity(normalizedCode, type),
      dependencies: this.extractBlockDependencies(normalizedCode),
      businessPurpose: this.identifyBusinessPurpose(normalizedCode, type)
    };
  }

  private normalizeCode(code: string): string {
    return code.trim().replace(/\s+/g, ' ').replace(/\r\n/g, '\n');
  }

  private determineBlockType(code: string, context: BlockContext): BlockType {
    const upperCode = code.toUpperCase();
    
    // Declaration Block Detection
    if (this.isDeclarationBlock(upperCode)) {
      return BlockType.DECLARATION;
    }
    
    // Initialization Block Detection
    if (this.isInitializationBlock(upperCode)) {
      return BlockType.INITIALIZATION;
    }
    
    // Transaction Block Detection
    if (this.isTransactionBlock(upperCode)) {
      return BlockType.TRANSACTION;
    }
    
    // Error Handling Block Detection
    if (this.isErrorHandlingBlock(upperCode)) {
      return BlockType.ERROR_HANDLING;
    }
    
    // Loop Block Detection
    if (this.isLoopBlock(upperCode)) {
      return BlockType.LOOP;
    }
    
    // Conditional Block Detection
    if (this.isConditionalBlock(upperCode)) {
      return BlockType.CONDITIONAL;
    }
    
    // Data Operation Block Detection
    if (this.isDataOperationBlock(upperCode)) {
      return BlockType.DATA_OPERATION;
    }
    
    // Calculation Block Detection
    if (this.isCalculationBlock(upperCode)) {
      return BlockType.CALCULATION;
    }
    
    // Cleanup Block Detection
    if (this.isCleanupBlock(upperCode)) {
      return BlockType.CLEANUP;
    }
    
    // Default to Business Logic if no specific type matches
    return BlockType.BUSINESS_LOGIC;
  }

  private isDeclarationBlock(code: string): boolean {
    const declarationPatterns = [
      /DECLARE\s+@\w+/,
      /DECLARE\s+\w+\s+CURSOR/,
      /CREATE\s+TABLE\s+#/,
      /DECLARE\s+@\w+\s+(INT|VARCHAR|DECIMAL|DATETIME|BIT)/
    ];
    
    return declarationPatterns.some(pattern => pattern.test(code));
  }

  private isInitializationBlock(code: string): boolean {
    const initPatterns = [
      /SET\s+@\w+\s*=/,
      /SELECT\s+@\w+\s*=/,
      /IF\s+@\w+\s+IS\s+NULL/,
      /SET\s+(NOCOUNT|XACT_ABORT)/,
      /RAISERROR.*RETURN/
    ];
    
    return initPatterns.some(pattern => pattern.test(code));
  }

  private isTransactionBlock(code: string): boolean {
    const transactionPatterns = [
      /BEGIN\s+(TRAN|TRANSACTION)/,
      /COMMIT\s+(TRAN|TRANSACTION)?/,
      /ROLLBACK\s+(TRAN|TRANSACTION)?/,
      /SAVE\s+TRANSACTION/
    ];
    
    return transactionPatterns.some(pattern => pattern.test(code));
  }

  private isErrorHandlingBlock(code: string): boolean {
    const errorPatterns = [
      /TRY\s*$/,
      /CATCH\s*$/,
      /RAISERROR/,
      /THROW\s+\d+/,
      /BEGIN\s+CATCH/
    ];
    
    return errorPatterns.some(pattern => pattern.test(code));
  }

  private isLoopBlock(code: string): boolean {
    const loopPatterns = [
      /WHILE\s+/,
      /FETCH\s+NEXT/,
      /CONTINUE/,
      /BREAK/
    ];
    
    return loopPatterns.some(pattern => pattern.test(code));
  }

  private isConditionalBlock(code: string): boolean {
    const conditionalPatterns = [
      /IF\s+/,
      /ELSE\s+/,
      /CASE\s+WHEN/,
      /END\s*$/
    ];
    
    return conditionalPatterns.some(pattern => pattern.test(code));
  }

  private isDataOperationBlock(code: string): boolean {
    const dataOpPatterns = [
      /SELECT\s+/,
      /INSERT\s+INTO/,
      /UPDATE\s+\w+\s+SET/,
      /DELETE\s+FROM/,
      /MERGE\s+/,
      /BULK\s+INSERT/
    ];
    
    return dataOpPatterns.some(pattern => pattern.test(code));
  }

  private isCalculationBlock(code: string): boolean {
    const calcPatterns = [
      /SUM\s*\(/,
      /COUNT\s*\(/,
      /AVG\s*\(/,
      /MAX\s*\(/,
      /MIN\s*\(/,
      /@\w+\s*=\s*@\w+\s*[\+\-\*\/]/,
      /OVER\s*\(/,
      /ROW_NUMBER\s*\(/
    ];
    
    return calcPatterns.some(pattern => pattern.test(code));
  }

  private isCleanupBlock(code: string): boolean {
    const cleanupPatterns = [
      /DROP\s+TABLE\s+#/,
      /CLOSE\s+\w+/,
      /DEALLOCATE\s+\w+/,
      /RETURN\s*$/,
      /SET\s+@\w+\s*=\s*NULL/
    ];
    
    return cleanupPatterns.some(pattern => pattern.test(code));
  }

  private determineBlockTitle(code: string, type: BlockType): string {
    const upperCode = code.toUpperCase();
    
    switch (type) {
      case BlockType.DECLARATION:
        if (upperCode.includes('CURSOR')) return 'Cursor Declaration';
        if (upperCode.includes('CREATE TABLE #')) return 'Temporary Table Declaration';
        return 'Variable Declaration';
        
      case BlockType.INITIALIZATION:
        if (upperCode.includes('NOCOUNT')) return 'Environment Setup';
        if (upperCode.includes('VALIDATION')) return 'Parameter Validation';
        return 'Variable Initialization';
        
      case BlockType.TRANSACTION:
        if (upperCode.includes('BEGIN TRAN')) return 'Transaction Start';
        if (upperCode.includes('COMMIT')) return 'Transaction Commit';
        if (upperCode.includes('ROLLBACK')) return 'Transaction Rollback';
        return 'Transaction Control';
        
      case BlockType.ERROR_HANDLING:
        if (upperCode.includes('TRY')) return 'Error Handling Setup';
        if (upperCode.includes('CATCH')) return 'Error Processing';
        return 'Error Management';
        
      case BlockType.LOOP:
        if (upperCode.includes('WHILE')) return 'While Loop';
        if (upperCode.includes('CURSOR')) return 'Cursor Loop';
        return 'Loop Processing';
        
      case BlockType.CONDITIONAL:
        if (upperCode.includes('CASE')) return 'Case Logic';
        return 'Conditional Logic';
        
      case BlockType.DATA_OPERATION:
        if (upperCode.includes('SELECT')) return 'Data Retrieval';
        if (upperCode.includes('INSERT')) return 'Data Insertion';
        if (upperCode.includes('UPDATE')) return 'Data Update';
        if (upperCode.includes('DELETE')) return 'Data Deletion';
        if (upperCode.includes('MERGE')) return 'Data Merge';
        return 'Data Operation';
        
      case BlockType.CALCULATION:
        if (upperCode.includes('SUM') || upperCode.includes('COUNT')) return 'Aggregation';
        if (upperCode.includes('ROW_NUMBER')) return 'Ranking Calculation';
        return 'Mathematical Calculation';
        
      case BlockType.CLEANUP:
        if (upperCode.includes('DROP')) return 'Resource Cleanup';
        if (upperCode.includes('RETURN')) return 'Result Return';
        return 'Cleanup Operations';
        
      default:
        return 'Business Logic';
    }
  }

  private generateBlockExplanation(code: string, type: BlockType): string {
    switch (type) {
      case BlockType.DECLARATION:
        return 'This block declares variables, cursors, or temporary structures needed by subsequent operations.';
        
      case BlockType.INITIALIZATION:
        return 'This block initializes variables, validates parameters, and sets up the execution environment.';
        
      case BlockType.TRANSACTION:
        return 'This block manages database transaction boundaries to ensure data consistency.';
        
      case BlockType.ERROR_HANDLING:
        return 'This block handles errors and exceptions that may occur during execution.';
        
      case BlockType.LOOP:
        return 'This block performs iterative operations over a set of data or conditions.';
        
      case BlockType.CONDITIONAL:
        return 'This block executes different logic paths based on specific conditions.';
        
      case BlockType.DATA_OPERATION:
        return 'This block performs data manipulation operations like select, insert, update, or delete.';
        
      case BlockType.CALCULATION:
        return 'This block performs mathematical calculations, aggregations, or data transformations.';
        
      case BlockType.CLEANUP:
        return 'This block cleans up resources, sets return values, and finalizes the operation.';
        
      default:
        return 'This block implements specific business logic or domain-specific operations.';
    }
  }

  private calculateBlockComplexity(code: string, type: BlockType): 'simple' | 'moderate' | 'complex' {
    const lines = code.split('\n').length;
    const upperCode = code.toUpperCase();
    
    let complexityScore = 0;
    
    // Base complexity by line count
    if (lines > 20) complexityScore += 3;
    else if (lines > 10) complexityScore += 2;
    else complexityScore += 1;
    
    // Add complexity for specific patterns
    const complexPatterns = [
      /CASE\s+WHEN.*WHEN.*WHEN/,  // Multiple CASE conditions
      /EXISTS\s*\(/,              // Subqueries
      /WITH\s+\w+\s+AS\s*\(/,     // CTEs
      /JOIN.*JOIN.*JOIN/,         // Multiple joins
      /UNION/,                    // Set operations
      /OVER\s*\(/,                // Window functions
      /CURSOR/,                   // Cursor usage
      /WHILE.*WHILE/,             // Nested loops
      /IF.*IF.*IF/                // Nested conditions
    ];
    
    complexPatterns.forEach(pattern => {
      if (pattern.test(upperCode)) complexityScore += 1;
    });
    
    // Type-specific complexity adjustments
    switch (type) {
      case BlockType.TRANSACTION:
      case BlockType.ERROR_HANDLING:
        complexityScore += 1;
        break;
      case BlockType.LOOP:
        complexityScore += 2;
        break;
      case BlockType.CALCULATION:
        if (upperCode.includes('OVER') || upperCode.includes('PARTITION')) {
          complexityScore += 2;
        }
        break;
    }
    
    if (complexityScore >= 6) return 'complex';
    if (complexityScore >= 3) return 'moderate';
    return 'simple';
  }

  private extractBlockDependencies(code: string): string[] {
    const dependencies: Set<string> = new Set();
    const upperCode = code.toUpperCase();
    
    // Extract variable dependencies
    const variableMatches = code.match(/@\w+/g);
    if (variableMatches) {
      variableMatches.forEach(variable => dependencies.add(variable));
    }
    
    // Extract table dependencies
    const tablePatterns = [
      /FROM\s+(\w+)/g,
      /JOIN\s+(\w+)/g,
      /UPDATE\s+(\w+)/g,
      /INSERT\s+INTO\s+(\w+)/g,
      /DELETE\s+FROM\s+(\w+)/g
    ];
    
    tablePatterns.forEach(pattern => {
      const matches = upperCode.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !['SELECT', 'FROM', 'WHERE'].includes(match[1])) {
          dependencies.add(match[1].toLowerCase());
        }
      }
    });
    
    return Array.from(dependencies);
  }

  private identifyBusinessPurpose(code: string, type: BlockType): string | undefined {
    const upperCode = code.toUpperCase();
    
    // Business purpose keywords
    const purposeKeywords: Record<string, string> = {
      'VALIDATION': 'Data Validation',
      'AUDIT': 'Audit Trail',
      'LOG': 'Logging',
      'NOTIFICATION': 'Notification',
      'REPORT': 'Reporting',
      'CALCULATION': 'Business Calculation',
      'SUMMARY': 'Data Summarization',
      'RECONCILIATION': 'Data Reconciliation',
      'IMPORT': 'Data Import',
      'EXPORT': 'Data Export',
      'SYNC': 'Data Synchronization',
      'CLEANUP': 'Data Cleanup',
      'ARCHIVE': 'Data Archival'
    };
    
    for (const [keyword, purpose] of Object.entries(purposeKeywords)) {
      if (upperCode.includes(keyword)) {
        return purpose;
      }
    }
    
    // Type-based business purposes
    switch (type) {
      case BlockType.CALCULATION:
        return 'Business Calculation';
      case BlockType.DATA_OPERATION:
        if (upperCode.includes('INSERT')) return 'Data Creation';
        if (upperCode.includes('UPDATE')) return 'Data Modification';
        if (upperCode.includes('DELETE')) return 'Data Removal';
        return 'Data Processing';
      case BlockType.ERROR_HANDLING:
        return 'Error Management';
      case BlockType.TRANSACTION:
        return 'Data Integrity';
      default:
        return undefined;
    }
  }
}