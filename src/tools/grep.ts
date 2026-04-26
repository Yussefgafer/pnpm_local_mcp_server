import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import * as readline from 'readline';
import { getFileMetadata, validatePath } from '../utils';

interface GrepResult {
  file: string;
  line: number;
  content: string;
  matchIndex: number;
}

/**
 * Searches for pattern in a single file
 * Automatically skips binary files detected via getFileMetadata
 */
async function searchInFile(
  filePath: string,
  pattern: RegExp,
  maxResults: number
): Promise<GrepResult[]> {
  const results: GrepResult[] = [];

  try {
    // Check if file is binary before reading
    const metadata = await getFileMetadata(filePath);
    if (metadata.isBinary) {
      return []; // Skip binary files silently
    }

    // Read file line by line for memory efficiency with large files
    const fileStream = await fsPromises.open(filePath, 'r').then(fd => {
      const stream = fd.createReadStream();
      stream.on('close', () => fd.close());
      return stream;
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;
      const match = pattern.exec(line);

      if (match) {
        results.push({
          file: filePath,
          line: lineNumber,
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
  } catch {
    // Skip files that can't be read
  }

  return results;
}

/**
 * Recursively searches for pattern in directory
 * Automatically skips binary files and respects ignore patterns
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

  // Default ignore patterns
  const ignorePatterns = ['node_modules', '.git', 'dist', '.svn', '.hg'];

  try {
    const items = await fs.readdir(dirPath);
    // Escape special regex characters except * and ?
    const escapedPattern = filePattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const fileRegex = new RegExp(escapedPattern);

    for (const item of items) {
      if (currentResults.length >= maxResults) {
        break;
      }

      // Skip ignored directories/files
      if (ignorePatterns.includes(item)) {
        continue;
      }

      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectories
        await searchInDirectory(itemPath, pattern, filePattern, maxResults, currentResults);
      } else if (stats.isFile() && fileRegex.test(item)) {
        // Search in file (binary detection happens in searchInFile)
        const fileResults = await searchInFile(itemPath, pattern, maxResults - currentResults.length);
        currentResults.push(...fileResults);
      }
    }
  } catch {
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
        // Security: Validate target path
        const pathError = validatePath(targetPath);
        if (pathError) return pathError;

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
                text: `**Error**: Path does not exist: ${targetPath}`
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
                text: `**Error**: Invalid regex pattern: ${e.message}`
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
            // Escape special regex characters except * and ?
            const escapedPattern = filePattern
              .replace(/[.+^${}()|[\]\\]/g, '\\$&')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            let fileRegex: RegExp;
            try {
              fileRegex = new RegExp(escapedPattern);
            } catch (e: any) {
              return {
                content: [{ type: 'text' as const, text: `**Error**: Invalid file pattern: ${e.message}` }],
                isError: true
              };
            }

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
                text: `**No matches found** for pattern \`${pattern}\` in \`${targetPath}\`\n\nNote: Binary files (images, PDFs, executables) are automatically skipped.`
              }
            ]
          };
        }

        const formattedResults = results.map(r =>
          `[${r.file}:${r.line}]: ${r.content.substring(0, 150)}${r.content.length > 150 ? '...' : ''}`
        ).join('\n');

        const truncated = results.length >= maxResults ? '\n\n**Note**: Results truncated - max limit reached' : '';

        return {
          content: [
            {
              type: 'text' as const,
              text: `**Found ${results.length} match(es)** for \`${pattern}\`:\n\n${formattedResults}${truncated}`
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `**Error during search**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
