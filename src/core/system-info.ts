import fs from "fs";
import path from "path";

// Read package.json once at startup
const pkgPath = path.join(process.cwd(), "package.json");
let pkgVersion = "0.0.0";

try {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkgVersion = pkg.version;
  }
} catch {
  console.warn("[SystemInfo] Failed to read package.json version");
}

export const SYSTEM_VERSION = pkgVersion;
export const SYSTEM_NAME = "TooLoo.ai";
export const SYSTEM_ID = Math.random().toString(36).substring(7);
export const START_TIME = Date.now();

export function getUptime(): number {
  return (Date.now() - START_TIME) / 1000;
}
