import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';
import { getDefaultPath, formatFileSize, validatePath } from '../utils';

/**
 * Tool: List Files
 * Lists files and directories with detailed metadata.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'list-files',
    {
      title: 'List Files',
      description:
        'Lists all files and directories in the specified path with detailed information (type, size, modified date). Defaults to Desktop if no path provided.',
      inputSchema: {
        folderPath: z.string().optional().describe('Directory path to list. Defaults to Desktop.'),
        includeHidden: z.boolean().optional().default(false).describe('Include hidden files starting with . (default: false).'),
        sortBy: z.enum(['name', 'size', 'modified']).optional().default('name').describe('Sort by: name, size, or modified (default: name).'),
      }
    },
    async ({ folderPath, includeHidden = false, sortBy = 'name' }) => {
      try {
        // Use cross-platform default path
        const targetPath = folderPath || getDefaultPath();

        // Security: Validate path is within allowed directories (if provided)
        if (folderPath) {
          const pathError = validatePath(targetPath);
          if (pathError) return pathError;
        }

        // Check if path exists
        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `**Error**: Path does not exist: \`${targetPath}\``
              }
            ],
            isError: true
          };
        }

        // Check if it's a directory
        const targetStats = await fs.stat(targetPath);
        if (!targetStats.isDirectory()) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `**Error**: Path is not a directory: \`${targetPath}\``
              }
            ],
            isError: true
          };
        }

        // Read directory
        const items = await fs.readdir(targetPath);

        // Filter hidden files
        const filteredItems = includeHidden
          ? items
          : items.filter((item) => !item.startsWith('.'));

        // Get detailed information with concurrency limit to prevent resource exhaustion
        const CONCURRENCY_LIMIT = 100; // Process max 100 files concurrently
        const fileDetails: Array<{name: string; isDirectory: boolean; size: number; modified: Date} | null> = [];

        for (let i = 0; i < filteredItems.length; i += CONCURRENCY_LIMIT) {
          const batch = filteredItems.slice(i, i + CONCURRENCY_LIMIT);
          const batchResults = await Promise.all(
            batch.map(async (item) => {
              const itemPath = path.join(targetPath, item);
              try {
                const stats = await fs.stat(itemPath);
                return {
                  name: item,
                  isDirectory: stats.isDirectory(),
                  size: stats.size,
                  modified: stats.mtime,
                };
              } catch {
                // Skip items we can't stat
                return null;
              }
            })
          );
          fileDetails.push(...batchResults);
        }

        // Remove nulls and sort
        const validItems = fileDetails.filter((item): item is NonNullable<typeof item> => item !== null);

        validItems.sort((a, b) => {
          if (sortBy === 'name') {
            // Directories first, then by name
            if (a.isDirectory !== b.isDirectory) {
              return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          } else if (sortBy === 'size') {
            return b.size - a.size;
          } else if (sortBy === 'modified') {
            return b.modified.getTime() - a.modified.getTime();
          }
          return 0;
        });

        // Format output
        if (validItems.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `**${targetPath}**\n\n*Directory is empty*`
              }
            ]
          };
        }

        let result = `**${targetPath}**\n\n`;
        result += `| Name | Type | Size | Modified |\n`;
        result += `|------|------|------|----------|\\n`;

        for (const item of validItems) {
          const icon = item.isDirectory ? '[DIR]' : '[FILE]';
          const type = item.isDirectory ? 'Directory' : 'File';
          const size = item.isDirectory ? '-' : formatFileSize(item.size);
          const date = item.modified.toISOString().split('T')[0];
          result += `| ${icon} ${item.name} | ${type} | ${size} | ${date} |\n`;
        }

        result += `\n**Total**: ${validItems.length} items (${validItems.filter(i => i.isDirectory).length} directories, ${validItems.filter(i => !i.isDirectory).length} files)`;

        return {
          content: [
            {
              type: 'text' as const,
              text: result
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `**Error listing files**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
