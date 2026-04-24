import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

interface GrepResult {
  file: string;
  line: number;
  content: string;
  matchIndex: number;
}

/**
 * Searches for pattern in a single file
 */
async function searchInFile(
  filePath: string,
  pattern: RegExp,
  maxResults: number
): Promise<GrepResult[]> {
  const results: GrepResult[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = pattern.exec(line);

      if (match) {
        results.push({
          file: filePath,
          line: i + 1,
          content: line,
          matchIndex: match.index
        });

        if (results.length >= maxResults) {
          break;
        }
      }

      // Reset regex lastIndex for next line
      pattern.lastIndex = 0;
    }
  } catch (error) {
    // Skip files that can't be read
  }

  return results;
}

/**
 * Recursively searches for pattern in directory
 */
async function searchInDirectory(
  dirPath: string,
  pattern: RegExp,
  filePattern: string,
  maxResults: number,
  currentResults: GrepResult[] = []
): Promise<GrepResult[]> {
  if (currentResults.length >= maxResults) {
    return currentResults;
  }

  try {
    const items = await fs.readdir(dirPath);
    const fileRegex = new RegExp(filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'));

    for (const item of items) {
      if (currentResults.length >= maxResults) {
        break;
      }

      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectories
        await searchInDirectory(itemPath, pattern, filePattern, maxResults, currentResults);
      } else if (stats.isFile() && fileRegex.test(item)) {
        // Search in file
        const fileResults = await searchInFile(itemPath, pattern, maxResults - currentResults.length);
        currentResults.push(...fileResults);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return currentResults;
}

/**
 * Tool: Grep - Search with Regex
 * Searches for a regex pattern in files
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'grep',
    {
      title: 'Grep - Search with Regex',
      description:
        'Searches for a regex pattern in files. Can search a single file or recursively through directories. Returns matching lines with file paths and line numbers.',
      inputSchema: {
        pattern: z.string().describe('The regex pattern to search for.'),
        path: z.string().describe('File or directory path to search in.'),
        recursive: z.boolean().optional().default(true).describe('Search recursively in directories (default: true).'),
        caseSensitive: z.boolean().optional().default(false).describe('Case-sensitive search (default: false).'),
        filePattern: z.string().optional().default('*').describe('File pattern filter when searching directories (e.g., "*.ts", "*.js").'),
        maxResults: z.number().int().positive().optional().default(100).describe('Maximum number of results to return (default: 100).'),
      }
    },
    async ({
      pattern,
      path: targetPath,
      recursive = true,
      caseSensitive = false,
      filePattern = '*',
      maxResults = 100,
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

        // Check if path exists
        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Path does not exist: ${targetPath}`
              }
            ],
            isError: true
          };
        }

        // Create regex with flags
        const flags = caseSensitive ? 'g' : 'gi';
        let regex: RegExp;
        try {
          regex = new RegExp(pattern, flags);
        } catch (e: any) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Invalid regex pattern: ${e.message}`
              }
            ],
            isError: true
          };
        }

        const stats = await fs.stat(targetPath);
        let results: GrepResult[] = [];

        if (stats.isFile()) {
          // Search in single file
          results = await searchInFile(targetPath, regex, maxResults);
        } else if (stats.isDirectory()) {
          // Search in directory
          if (recursive) {
            results = await searchInDirectory(targetPath, regex, filePattern, maxResults);
          } else {
            // Non-recursive - only search files in root
            const items = await fs.readdir(targetPath);
            const fileRegex = new RegExp(filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'));

            for (const item of items) {
              const itemPath = path.join(targetPath, item);
              const itemStats = await fs.stat(itemPath);

              if (itemStats.isFile() && fileRegex.test(item)) {
                const fileResults = await searchInFile(itemPath, regex, maxResults - results.length);
                results.push(...fileResults);

                if (results.length >= maxResults) {
                  break;
                }
              }
            }
          }
        }

        // Format results
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No matches found for pattern "${pattern}" in ${targetPath}`
              }
            ]
          };
        }

        const formattedResults = results.map(r =>
          `${r.file}:${r.line}: ${r.content}`
        ).join('\n');

        const truncated = results.length >= maxResults ? '\n[Results truncated - max limit reached]' : '';

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${results.length} match(es) for "${pattern}":\n\n${formattedResults}${truncated}`
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
