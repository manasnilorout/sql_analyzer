// API client for communicating with the AI server

import type { 
  AnalysisRequest, 
  AnalysisResponse, 
  FullAnalysisPayload, 
  AnalysisError,
  ReportGenerationRequest 
} from '@shared/types/analysis';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData.details
      );
    }

    // Handle different content types
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/html')) {
      return response.text() as unknown as T;
    } else {
      return response.text() as unknown as T;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0
    );
  }
}

/**
 * API client class
 */
export class ApiClient {
  /**
   * Analyze SQL code
   */
  static async analyzeSQL(request: AnalysisRequest): Promise<FullAnalysisPayload> {
    const response = await apiRequest<AnalysisResponse>('/api/analysis/sql', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    // Check if response is an error
    if ('error' in response) {
      throw new ApiError(
        response.error,
        400,
        response.details
      );
    }

    return response;
  }

  /**
   * Generate HTML report
   */
  static async generateReport(request: ReportGenerationRequest): Promise<string> {
    return apiRequest<string>('/api/analysis/reports/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
    environment: string;
  }> {
    return apiRequest('/api/health');
  }
}

export { ApiError };
export type { AnalysisRequest, AnalysisResponse, FullAnalysisPayload, AnalysisError }; 