const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const packageJson = require("../package.json");
const currentVersion = packageJson.version;

console.log(`📦 Tagging codebase with version: ${currentVersion}`);

const filePatterns = [
  "src/**/*.{js,ts,tsx,jsx,css,html}",
  "servers/**/*.{js,ts}",
  "web-app/**/*.{html,css,js}",
  "config/**/*.{js,json}",
];

const commentStyles = {
  ".js": { start: "// @version ", end: "" },
  ".ts": { start: "// @version ", end: "" },
  ".tsx": { start: "// @version ", end: "" },
  ".jsx": { start: "// @version ", end: "" },
  ".css": { start: "/* @version ", end: " */" },
  ".html": { start: "<!-- @version ", end: " -->" },
  ".json": { start: null, end: null },
};

function tagFile(filePath) {
  const ext = path.extname(filePath);
  const style = commentStyles[ext];

  if (!style || !style.start) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, "utf8");
    const versionTag = `${style.start}${currentVersion}${style.end}`;
    const versionRegex = new RegExp(
      `${escapeRegExp(style.start)}[0-9]+\\.[0-9]+\\.[0-9]+${escapeRegExp(style.end)}`,
      "g"
    );

    if (versionRegex.test(content)) {
      const newContent = content.replace(versionRegex, versionTag);
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated: ${filePath}`);
      }
    } else {
      let newContent = content;
      if (
        ext === ".html" &&
        content.toLowerCase().includes("<!doctype html>")
      ) {
        newContent = content.replace(
          /<!doctype html>/i,
          `<!DOCTYPE html>\n${versionTag}`
        );
      } else {
        newContent = `${versionTag}\n${content}`;
      }
      fs.writeFileSync(filePath, newContent);
      console.log(`Tagged: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Main execution
filePatterns.forEach((pattern) => {
  try {
    const files = globSync(pattern);
    files.forEach(tagFile);
  } catch (err) {
    console.error(`Error finding files for pattern ${pattern}:`, err);
  }
});
