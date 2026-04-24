import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

/**
 * Matches a pattern against a path segment
 */
function matchPattern(pattern: string, str: string): boolean {
  // Convert glob pattern to regex
  const regexStr = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\./g, '\\.')
    .replace(/{{GLOBSTAR}}/g, '.*');

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(str);
}

/**
 * Recursively finds files matching the pattern
 */
async function globSearch(
  basePath: string,
  pattern: string,
  ignorePatterns: string[],
  absolute: boolean,
  currentDir: string = basePath,
  results: string[] = []
): Promise<string[]> {
  try {
    const items = await fs.readdir(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const relativePath = path.relative(basePath, itemPath);

      // Check if should be ignored
      const shouldIgnore = ignorePatterns.some(ignore => {
        const ignoreRegex = new RegExp(
          ignore.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.')
        );
        return ignoreRegex.test(item) || ignoreRegex.test(relativePath);
      });

      if (shouldIgnore) {
        continue;
      }

      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectories
        await globSearch(basePath, pattern, ignorePatterns, absolute, itemPath, results);
      } else if (stats.isFile()) {
        // Check if file matches pattern
        if (matchPattern(pattern, relativePath) || matchPattern(pattern, item)) {
          results.push(absolute ? itemPath : relativePath);
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return results;
}

/**
 * Tool: Glob - Find Files by Pattern
 * Finds files matching a glob pattern
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'glob',
    {
      title: 'Glob - Find Files by Pattern',
      description:
        'Finds files matching a glob pattern (e.g., "src/**/*.ts", "*.json"). Supports ** for recursive matching and * for single-level wildcards. Returns array of file paths.',
      inputSchema: {
        pattern: z.string().describe('Glob pattern to match files (e.g., "src/**/*.ts", "*.json").'),
        cwd: z.string().optional().default('.').describe('Base directory for search (default: current directory).'),
        ignore: z.array(z.string()).optional().default(['node_modules', '.git', 'dist']).describe('Patterns to ignore (default: ["node_modules", ".git", "dist"]).'),
        absolute: z.boolean().optional().default(true).describe('Return absolute paths (default: true) or relative paths.'),
      }
    },
    async ({
      pattern,
      cwd = '.',
      ignore = ['node_modules', '.git', 'dist'],
      absolute = true,
    }) => {
      try {
        // Validate pattern
        if (!pattern) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: pattern is required'
              }
            ],
            isError: true
          };
        }

        // Resolve base path
        const basePath = path.resolve(cwd);

        // Check if path exists
        if (!(await fs.pathExists(basePath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Directory does not exist: ${basePath}`
              }
            ],
            isError: true
          };
        }

        // Perform search
        const results = await globSearch(basePath, pattern, ignore, absolute);

        // Sort results for consistency
        results.sort();

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No files found matching pattern "${pattern}" in ${basePath}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${results.length} file(s) matching "${pattern}":\n\n${results.join('\n')}`
            }
          ]
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error during search: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
