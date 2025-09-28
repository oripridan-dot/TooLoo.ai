import { AIResponse, ApiResponse, PerformanceMetric } from './types.js';

/**
 * Generates a unique ID using timestamp and random string
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date(),
  };
}

/**
 * Calculates token usage cost based on provider and token counts
 */
export function calculateTokenCost(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  const rates: Record<string, { prompt: number; completion: number }> = {
    openai: { prompt: 0.0015, completion: 0.002 }, // per 1K tokens
    claude: { prompt: 0.008, completion: 0.024 },
    gemini: { prompt: 0.0005, completion: 0.0015 },
    deepseek: { prompt: 0.0001, completion: 0.0002 },
  };

  const rate = rates[provider] || rates.openai;
  return (
    (promptTokens / 1000) * rate.prompt +
    (completionTokens / 1000) * rate.completion
  );
}

/**
 * Measures execution time of an async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTimeMs: number }> {
  const startTime = performance.now();
  const result = await fn();
  const executionTimeMs = performance.now() - startTime;
  return { result, executionTimeMs };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}

/**
 * Validates and sanitizes code input
 */
export function sanitizeCode(code: string, language: string): string {
  // Remove potentially dangerous patterns
  const dangerousPatterns = [
    /require\s*\(\s*['"]fs['"]\s*\)/g,
    /import\s+.*\s+from\s+['"]fs['"]/g,
    /eval\s*\(/g,
    /Function\s*\(/g,
    /process\.exit/g,
    /process\.kill/g,
  ];

  let sanitized = code;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '/* REMOVED_FOR_SECURITY */');
  });

  return sanitized;
}

/**
 * Calculates moving average for performance metrics
 */
export function calculateMovingAverage(
  metrics: PerformanceMetric[],
  windowSize: number = 10
): number {
  const recent = metrics.slice(-windowSize);
  if (recent.length === 0) return 0;
  
  const sum = recent.reduce((acc, metric) => acc + metric.responseTime, 0);
  return sum / recent.length;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const copy: any = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), waitMs);
  };
}

/**
 * Formats bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Extracts code blocks from markdown text
 */
export function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }

  return blocks;
}