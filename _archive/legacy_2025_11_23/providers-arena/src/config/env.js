import dotenv from 'dotenv';

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database Configuration
  DB_URI: process.env.DATABASE_URL || process.env.DB_URI || 'mongodb://localhost:27017/providers-arena',
  
  // AI Provider API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Legacy API Key (for backward compatibility)
  API_KEY: process.env.API_KEY || '',
};

export default config;