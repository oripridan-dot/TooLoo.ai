#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

interface SearchMatch {
  filePath: string;
  fileName: string;
  matchType: 'filename' | 'content';
  matches: string[];
  lineNumbers?: number[];
}

interface SearchOptions {
  rootDir: string;
  keywords: string[];
  fileExtensions: string[];
  maxFileSize: number; // in bytes
  excludeDirs: string[];
}

class ImprovementPlanSearcher {
  private options: SearchOptions;
  private results: SearchMatch[] = [];

  constructor(options: Partial<SearchOptions> = {}) {
    this.options = {
      rootDir: process.cwd(),
      keywords: [
        'improvement',
        'plan',
        'roadmap', 
        'todo',
        'backlog',
        'action item',
        'next steps',
        'enhancement',
        'optimization',
        'refactor'
      ],
      fileExtensions: [
        '.md', '.txt', '.json', '.yml', '.yaml', 
        '.rst', '.org', '.adoc', '.wiki'
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      excludeDirs: [
        'node_modules',
        '.git',
        '.next',
        'dist',
        'build',
        '.cache',
        'coverage'
      ],
      ...options
    };
  }

  /**
   * Main search function that orchestrates filename and content searches
   */
  async search(): Promise<SearchMatch[]> {
    console.log(`🔍 Searching for improvement plans in: ${this.options.rootDir}`);
    console.log(`📝 Keywords: ${this.options.keywords.join(', ')}`);
    
    try {
      await this.searchDirectory(this.options.rootDir);
      
      // Sort results by relevance (filename matches first, then by number of matches)
      this.results.sort((a, b) => {
        if (a.matchType !== b.matchType) {
          return a.matchType === 'filename' ? -1 : 1;
        }
        return b.matches.length - a.matches.length;
      });

      this.displayResults();
      return this.results;
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Recursively search through directories
   */
  private async searchDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.options.excludeDirs.includes(entry.name)) {
            continue;
          }
          
          await this.searchDirectory(fullPath);
        } else if (entry.isFile()) {
          await this.searchFile(fullPath);
        }
      }
    } catch (error) {
      // Log but don't fail on permission errors
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        console.warn(`⚠️  Permission denied: ${dirPath}`);
      } else {
        console.error(`❌ Error reading directory ${dirPath}:`, error);
      }
    }
  }

  /**
   * Search individual file for matches
   */
  private async searchFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    try {
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > this.options.maxFileSize) {
        console.warn(`⚠️  Skipping large file: ${filePath} (${stats.size} bytes)`);
        return;
      }

      // Check filename for matches
      const filenameMatches = this.findKeywordMatches(fileName.toLowerCase());
      if (filenameMatches.length > 0) {
        this.results.push({
          filePath,
          fileName,
          matchType: 'filename',
          matches: filenameMatches
        });
      }

      // Search content for text files
      if (this.isTextFile(fileExt)) {
        await this.searchFileContent(filePath, fileName);
      }

    } catch (error) {
      console.warn(`⚠️  Error processing file ${filePath}:`, error);
    }
  }

  /**
   * Search file content for keyword matches
   */
  private async searchFileContent(filePath: string, fileName: string): Promise<void> {
    const matches: string[] = [];
    const lineNumbers: number[] = [];
    let lineNumber = 0;

    try {
      const fileStream = createReadStream(filePath, { encoding: 'utf8' });
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        lineNumber++;
        const lowerLine = line.toLowerCase();
        const lineMatches = this.findKeywordMatches(lowerLine);
        
        if (lineMatches.length > 0) {
          matches.push(...lineMatches);
          lineNumbers.push(lineNumber);
        }
      }

      if (matches.length > 0) {
        this.results.push({
          filePath,
          fileName,
          matchType: 'content',
          matches: [...new Set(matches)], // Remove duplicates
          lineNumbers
        });
      }

    } catch (error) {
      console.warn(`⚠️  Error reading file content ${filePath}:`, error);
    }
  }

  /**
   * Find keyword matches in text
   */
  private findKeywordMatches(text: string): string[] {
    const matches: string[] = [];
    
    for (const keyword of this.options.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    }
    
    return matches;
  }

  /**
   * Check if file is likely a text file based on extension
   */
  private isTextFile(extension: string): boolean {
    return this.options.fileExtensions.includes(extension) ||
           extension === '' || // Files without extension
           /^\.(log|config|conf|ini)$/.test(extension);
  }

  /**
   * Display search results in a formatted way
   */
  private displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 SEARCH RESULTS: ${this.results.length} files found`);
    console.log('='.repeat(60));

    if (this.results.length === 0) {
      console.log('❌ No improvement plan documents found.');
      console.log('\n💡 Suggestions:');
      console.log('   • Create a README.md with project roadmap');
      console.log('   • Add TODO.md for action items');
      console.log('   • Document improvement plans in docs/');
      return;
    }

    // Group by match type
    const filenameMatches = this.results.filter(r => r.matchType === 'filename');
    const contentMatches = this.results.filter(r => r.matchType === 'content');

    if (filenameMatches.length > 0) {
      console.log('\n📁 FILENAME MATCHES:');
      filenameMatches.forEach(match => {
        console.log(`   📄 ${match.filePath}`);
        console.log(`      Keywords: ${match.matches.join(', ')}`);
      });
    }

    if (contentMatches.length > 0) {
      console.log('\n📝 CONTENT MATCHES:');
      contentMatches.forEach(match => {
        console.log(`   📄 ${match.filePath}`);
        console.log(`      Keywords: ${match.matches.join(', ')}`);
        if (match.lineNumbers && match.lineNumbers.length > 0) {
          const lines = match.lineNumbers.slice(0, 5).join(', ');
          const more = match.lineNumbers.length > 5 ? ` (+${match.lineNumbers.length - 5} more)` : '';
          console.log(`      Lines: ${lines}${more}`);
        }
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rootDir = args[0] || process.cwd();

  console.log('🚀 Improvement Plan Document Searcher');
  console.log('=====================================\n');

  try {
    const searcher = new ImprovementPlanSearcher({ rootDir });
    const results = await searcher.search();
    
    // Export results as JSON for programmatic use
    const outputFile = path.join(process.cwd(), 'improvement-plans-search-results.json');
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { ImprovementPlanSearcher, SearchMatch, SearchOptions };

// Run if called directly
if (require.main === module) {
  main();
}
