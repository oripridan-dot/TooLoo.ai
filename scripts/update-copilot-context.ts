// @version 2.1.212

import fs from "fs";
import path from "path";
import { glob } from "glob";

const INSTRUCTIONS_FILE = path.join(
  process.cwd(),
  ".github/copilot-instructions.md",
);

async function generateContext() {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));

  // Get file structure of src (limit to depth 3 to avoid noise, or just list key modules)
  // Actually, a full list is useful for Copilot to know file existence.
  const srcFiles = await glob("src/**/*.{ts,tsx,js,jsx}", {
    ignore: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
  });

  // Group by top-level directory in src
  const structureMap: Record<string, string[]> = {};
  srcFiles.forEach((f) => {
    const parts = f.split("/");
    const topLevel = parts[1] || "root"; // src/xyz -> xyz
    if (!structureMap[topLevel]) structureMap[topLevel] = [];
    structureMap[topLevel].push(f);
  });

  let structureMd = "";
  for (const [key, files] of Object.entries(structureMap)) {
    structureMd += `- **${key}** (${files.length} files)\n`;
    // Only list first 5 files and a count if too many, or list all if reasonable
    if (files.length > 20) {
      structureMd +=
        files
          .slice(0, 10)
          .map((f) => `  - ${f}`)
          .join("\n") + `\n  - ... and ${files.length - 10} more\n`;
    } else {
      structureMd += files.map((f) => `  - ${f}`).join("\n") + "\n";
    }
  }

  // Get recent docs (root markdown files)
  const docFiles = await glob("*.md");
  const docs = docFiles.map((f) => `- [${path.basename(f)}](${f})`).join("\n");

  return `
## 🔄 Dynamic Context (Auto-Updated)
*Last Updated: ${new Date().toISOString()}*

### 📦 Project Status
- **Version**: ${packageJson.version}
- **Scripts**: ${Object.keys(packageJson.scripts || {}).join(", ")}

### 📂 Module Structure (src/)
${structureMd}

### 📚 Documentation Index
${docs}
`;
}

async function updateInstructions() {
  if (!fs.existsSync(INSTRUCTIONS_FILE)) {
    console.error(`File not found: ${INSTRUCTIONS_FILE}`);
    return;
  }

  let content = fs.readFileSync(INSTRUCTIONS_FILE, "utf-8");
  const startMarker = "<!-- DYNAMIC-CONTEXT-START -->";
  const endMarker = "<!-- DYNAMIC-CONTEXT-END -->";

  const newContext = await generateContext();

  if (content.includes(startMarker)) {
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
    content = content.replace(
      regex,
      `${startMarker}\n${newContext}\n${endMarker}`,
    );
  } else {
    content += `\n\n${startMarker}\n${newContext}\n${endMarker}`;
  }

  fs.writeFileSync(INSTRUCTIONS_FILE, content);
  console.log(`✅ Updated ${INSTRUCTIONS_FILE} with latest project context.`);
}

updateInstructions().catch(console.error);
