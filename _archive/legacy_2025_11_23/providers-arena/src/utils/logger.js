export const logger = {
  info: (message) => {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  },
  warn: (message) => {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  },
  error: (message) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  },
};