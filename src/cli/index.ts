// @version 2.1.283
#!/usr/bin/env node
import { Command } from "commander";
import { deployCommand } from "./commands/deploy.js";
import { logsCommand } from "./commands/logs.js";
import { systemCommand } from "./commands/system.js";
import fs from "fs-extra";
import path from "path";

const program = new Command();

async function main() {
  const packageJson = await fs.readJson(
    path.join(process.cwd(), "package.json"),
  );

  program
    .name("tooloo")
    .description("TooLoo.ai Platform CLI v2.0")
    .version(packageJson.version)
    .option("--json", "Output results as JSON")
    .option("-c, --config <path>", "Path to tooloo.yaml", "tooloo.yaml");

  program.addCommand(deployCommand);
  program.addCommand(logsCommand);
  program.addCommand(systemCommand);

  program.parse(process.argv);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
