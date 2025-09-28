// Utility functions for the engine
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTimeMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const executionTimeMs = Date.now() - startTime;
  return { result, executionTimeMs };
}

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