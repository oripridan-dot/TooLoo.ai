/**
 * Golden Dataset Loader
 * Loads and validates golden inputs from YAML files
 * 
 * @version 2.0.0-alpha.0
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { parse as parseYaml } from 'yaml';
import { GoldenInputSchema, type GoldenInput, type EvalCategory } from './types.js';

export interface LoadOptions {
  /** Filter by categories */
  categories?: EvalCategory[];
  /** Filter by tags */
  tags?: string[];
  /** Only regression tests */
  regressionOnly?: boolean;
  /** Limit number of inputs */
  limit?: number;
  /** Shuffle order */
  shuffle?: boolean;
}

/**
 * Load golden inputs from a directory
 */
export async function loadGoldenInputs(
  directory: string,
  options: LoadOptions = {}
): Promise<GoldenInput[]> {
  const inputs: GoldenInput[] = [];
  
  // Read all YAML files in directory
  const files = await readdir(directory);
  const yamlFiles = files.filter(f => ['.yaml', '.yml'].includes(extname(f)));
  
  for (const file of yamlFiles) {
    const filePath = join(directory, file);
    const content = await readFile(filePath, 'utf-8');
    
    try {
      const data = parseYaml(content);
      
      // Handle both single input and array of inputs
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        const validated = GoldenInputSchema.safeParse(item);
        
        if (validated.success) {
          inputs.push(validated.data);
        } else {
          console.warn(`Invalid golden input in ${file}:`, validated.error.message);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
    }
  }
  
  // Apply filters
  let filtered = inputs;
  
  if (options.categories?.length) {
    filtered = filtered.filter(i => options.categories!.includes(i.category));
  }
  
  if (options.tags?.length) {
    filtered = filtered.filter(i => 
      options.tags!.some(tag => i.tags.includes(tag))
    );
  }
  
  if (options.regressionOnly) {
    filtered = filtered.filter(i => i.regression);
  }
  
  // Shuffle if requested
  if (options.shuffle) {
    filtered = shuffleArray(filtered);
  }
  
  // Apply limit
  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Load a single golden input by ID
 */
export async function loadGoldenInputById(
  directory: string,
  id: string
): Promise<GoldenInput | null> {
  const inputs = await loadGoldenInputs(directory);
  return inputs.find(i => i.id === id) ?? null;
}

/**
 * Get summary of golden inputs
 */
export async function getGoldenInputsSummary(directory: string): Promise<{
  total: number;
  byCategory: Record<EvalCategory, number>;
  byDifficulty: Record<string, number>;
  regressionCount: number;
  tags: string[];
}> {
  const inputs = await loadGoldenInputs(directory);
  
  const byCategory: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const allTags = new Set<string>();
  let regressionCount = 0;
  
  for (const input of inputs) {
    byCategory[input.category] = (byCategory[input.category] ?? 0) + 1;
    byDifficulty[input.difficulty] = (byDifficulty[input.difficulty] ?? 0) + 1;
    
    if (input.regression) regressionCount++;
    
    for (const tag of input.tags) {
      allTags.add(tag);
    }
  }
  
  return {
    total: inputs.length,
    byCategory: byCategory as Record<EvalCategory, number>,
    byDifficulty,
    regressionCount,
    tags: Array.from(allTags),
  };
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    const swap = result[j];
    if (temp !== undefined && swap !== undefined) {
      result[i] = swap;
      result[j] = temp;
    }
  }
  return result;
}
