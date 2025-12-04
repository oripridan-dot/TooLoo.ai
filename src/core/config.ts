import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // AI Providers
  DEEPSEEK_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  HF_API_KEY: z.string().optional(),

  // Models
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-20241022'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_MODEL: z.string().default('gemini-2.0-pro-exp-02-05'),
  LOCALAI_MODEL: z.string().default('gpt-4'),

  // Ports
  WEB_PORT: z.coerce.number().default(3000),
  TRAINING_PORT: z.coerce.number().default(3001),
  META_PORT: z.coerce.number().default(3002),
  BUDGET_PORT: z.coerce.number().default(3003),
  COACH_PORT: z.coerce.number().default(3004),
  CUP_PORT: z.coerce.number().default(3005),
  PRODUCT_PORT: z.coerce.number().default(3006),
  SEGMENTATION_PORT: z.coerce.number().default(3007),
  REPORTS_PORT: z.coerce.number().default(3008),
  CAPABILITIES_PORT: z.coerce.number().default(3009),
  ACTIVITY_MONITOR_PORT: z.coerce.number().default(3050),
  ORCH_CTRL_PORT: z.coerce.number().default(3123),

  // System
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Sandbox
  SANDBOX_MODE: z.enum(['local', 'docker']).default('local'),
  SANDBOX_DOCKER_IMAGE: z.string().default('node:18-alpine'),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

// Parse and validate
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
  // We don't throw here to allow the system to start in a degraded state or for tests to mock it later
  // But in a strict production env, we might want to exit.
}

export const config = result.success ? result.data : envSchema.parse({}); // Fallback to defaults if parsing fails (which shouldn't happen for defaults)
