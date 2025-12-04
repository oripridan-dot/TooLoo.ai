// @version 2.2.330
import { Request, Response, NextFunction } from 'express';

export interface ChaosConfig {
  enabled: boolean;
  failureRate: number; // 0.0 to 1.0
  latencyMs: number; // Added latency
  errorTypes: ('500' | '408' | '429')[];
}

let config: ChaosConfig = {
  enabled: false,
  failureRate: 0.1,
  latencyMs: 0,
  errorTypes: ['500'],
};

export const setChaosConfig = (newConfig: Partial<ChaosConfig>) => {
  config = { ...config, ...newConfig };
  console.log('[ChaosMonkey] Configuration updated:', config);
};

export const getChaosConfig = () => config;

export const chaosMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!config.enabled) return next();

  // Skip chaos for system control routes to allow disabling it
  if (req.path.includes('/system/chaos')) return next();

  // Random failure
  if (Math.random() < config.failureRate) {
    const errorType = config.errorTypes[Math.floor(Math.random() * config.errorTypes.length)];

    if (config.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.latencyMs));
    }

    console.warn(`[ChaosMonkey] Injecting ${errorType} error into ${req.method} ${req.path}`);

    switch (errorType) {
      case '500':
        return res.status(500).json({ error: 'Chaos Monkey: Internal Server Error' });
      case '408':
        return res.status(408).json({ error: 'Chaos Monkey: Request Timeout' });
      case '429':
        return res.status(429).json({ error: 'Chaos Monkey: Too Many Requests' });
    }
  }

  // Random latency without failure
  if (config.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.latencyMs));
  }

  next();
};
