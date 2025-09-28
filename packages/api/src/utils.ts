export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string
) {
  return {
    success,
    data,
    error,
    timestamp: new Date(),
  };
}