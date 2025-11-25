import fs from "fs-extra";
import yaml from "js-yaml";
import path from "path";
import { z } from "zod";

const ConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    version: z.string().optional(),
  }),
  deploy: z
    .object({
      target: z.enum(["local", "remote"]).default("local"),
      resources: z
        .object({
          cpu: z.string().optional(),
          memory: z.string().optional(),
          gpu: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function readConfig(configPath: string): Promise<Config | null> {
  const absolutePath = path.resolve(process.cwd(), configPath);

  if (!(await fs.pathExists(absolutePath))) {
    return null;
  }

  try {
    const content = await fs.readFile(absolutePath, "utf8");
    const rawConfig = yaml.load(content);
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    throw new Error(`Failed to parse config file: ${error.message}`);
  }
}
