import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AnalysisService } from '../services/AnalysisService';
import { createLogger } from '../utils/logger';
import type { AnalysisRequest, ReportGenerationRequest } from '@shared/types/analysis';
import { LlmType } from '../ai/llm/LlmFactory'; // Import LlmType

const router = Router();
const logger = createLogger();
const analysisService = new AnalysisService();

// Validation middleware
const analyzeValidation = [
  body('sqlCode').isString().notEmpty().withMessage('SQL code is required'),
  body('blockType').isString().notEmpty().withMessage('Block type is required'),
];

/**
 * POST /api/analysis/sql
 * Analyze SQL code using AI flows
 */
router.post('/sql', analyzeValidation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { sqlCode, blockType, llmProvider }: AnalysisRequest & { llmProvider?: LlmType } = req.body;

    logger.info('Starting SQL analysis', {
      blockType,
      codeLength: sqlCode.length,
      provider: llmProvider || 'default (google-generic)', // Log the provider
      requestId: req.headers['x-request-id'],
    });

    // Call the analysis service (moved from server actions)
    const result = await analysisService.runAnalysis(sqlCode, blockType, llmProvider);

    // Check if result is an error
    if ('error' in result) {
      logger.warn('Analysis failed', {
        error: result.error,
        details: result.details,
        chunkNumber: result.chunkNumber,
      });

      return res.status(400).json(result);
    }

    logger.info('Analysis completed successfully', {
      chunksAnalyzed: result.chunkAnalyses.length,
      hasOverallSummary: !!result.overallScriptSummary,
    });

    res.json(result);
  } catch (error) {
    logger.error('Unexpected error during analysis', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    next(error);
  }
});

/**
 * POST /api/analysis/reports/generate
 * Generate HTML report from analysis results
 */
router.post('/reports/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { analysisData, reportType }: ReportGenerationRequest = req.body;

    if (!analysisData) {
      return res.status(400).json({
        error: 'Analysis data is required',
      });
    }

    logger.info('Generating report', {
      reportType,
      chunksCount: analysisData.chunkAnalyses.length,
    });

    const report = await analysisService.generateReport(analysisData, reportType);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="sql-analysis-report.html"');
    res.send(report);
  } catch (error) {
    logger.error('Error generating report', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
});

// Commenting out the conflicting /api/analyze route as per plan
/*
router.post('/analyze', async (req, res) => {
  try {
    const { sqlCode, model = 'gemini' } = req.body as AnalysisRequest; // model here was LlmType

    if (!sqlCode) {
      return res.status(400).json({ error: 'SQL code is required' });
    }

    // This check would need to be updated for LlmType if route is kept
    // if (model !== 'gemini' && model !== 'openai') {
    //   return res.status(400).json({ error: 'Invalid model selection. Must be either "gemini" or "openai"' });
    // }

    // The following call to runAnalysis would fail as its signature has changed.
    // It now expects (sqlCode, blockType, providerName)
    // const result = await analysisService.runAnalysis(sqlCode, model); // This 'model' was providerName
    // res.json(result);
    res.status(501).json({ error: "This /analyze endpoint is deprecated. Use /api/analysis/sql." });
  } catch (error) {
    console.error('Error in analysis endpoint:', error);
    res.status(500).json({
      error: 'Failed to analyze SQL code',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
*/

export { router as analysisRoutes }; 