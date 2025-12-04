// @version 2.1.28
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '.env');
let initialized = false;
let lastSignature: string | null = null;

function applyEnv() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const contents = fs.readFileSync(envPath, 'utf8');
    const signature = `${fs.statSync(envPath).mtimeMs}:${contents.length}`;
    if (signature === lastSignature) {
      return;
    }

    const parsed = dotenv.parse(contents);
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'string') {
        process.env[key] = value;
      }
    });

    lastSignature = signature;
    console.log(`[env-loader] Loaded ${Object.keys(parsed).length} env vars from .env`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn('[env-loader] Failed to apply .env file:', errMsg);
  }
}

export default function ensureEnvLoaded({ watch = true } = {}) {
  applyEnv();

  if (!initialized && watch && fs.existsSync(envPath)) {
    initialized = true;
    fs.watchFile(envPath, { interval: 750 }, () => {
      applyEnv();
    });
  }
}

// Auto-load on import
ensureEnvLoaded();
