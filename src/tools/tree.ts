import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import path from 'path';
import { getDefaultPath } from '../utils';

/**
 * Recursively builds a tree representation of a directory
 */
async function buildTree(
  directory: string,
  prefix = '',
  maxDepth?: number,
  ignoreSet?: Set<string>,
  currentDepth = 0
): Promise<string> {
  if (maxDepth !== undefined && currentDepth >= maxDepth) {
    return '';
  }

  let items;
  try {
    items = await fs.readdir(directory);
  } catch {
    return ''; // Cannot read directory, return empty string
  }

  // Filter hidden files and ignored items
  const filteredItems = items.filter(item => {
    if (item.startsWith('.') && !ignoreSet?.has(item)) return false;
    return !ignoreSet?.has(item);
  });

  let tree = '';

  for (let i = 0; i < filteredItems.length; i++) {
    const item = filteredItems[i];
    const itemPath = path.join(directory, item);
    const isLast = i === filteredItems.length - 1;
    const connector = isLast ? '└── ' : '├── ';

    tree += `${prefix}${connector}${item}\n`;

    let stats;
    try {
      stats = await fs.stat(itemPath);
    } catch {
      continue; // Cannot stat file, skip
    }

    if (stats.isDirectory()) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      tree += await buildTree(itemPath, newPrefix, maxDepth, ignoreSet, currentDepth + 1);
    }
  }
  return tree;
}

/**
 * Tool: Tree
 * Generates a text-based tree map of a directory structure.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'tree',
    {
      title: 'Tree - Directory Structure',
      description: 'Generates a text-based tree view of a directory structure. Similar to the Unix `tree` command.',
      inputSchema: {
        path: z.string().optional().describe('Root directory path. Defaults to Desktop.'),
        maxDepth: z.number().int().positive().optional().describe('Maximum depth to traverse (unlimited if not specified).'),
        ignore: z.array(z.string()).optional().default(['node_modules', '.git', 'dist']).describe('List of file/folder names to ignore.'),
      },
    },
    async ({ path: rootPath, maxDepth, ignore = ['node_modules', '.git', 'dist'] }) => {
      try {
        const targetPath = rootPath || getDefaultPath();

        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Path does not exist: \`${targetPath}\``
              }
            ],
            isError: true
          };
        }

        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Path is not a directory: \`${targetPath}\``
              }
            ],
            isError: true
          };
        }

        const ignoreSet = new Set(ignore);
        const tree = await buildTree(targetPath, '', maxDepth, ignoreSet);
        const depthInfo = maxDepth ? ` (max depth: ${maxDepth})` : '';
        const map = `📁 **${path.basename(targetPath)}**${depthInfo}\n\n\`\`\`\n${tree || '(empty directory)'}\`\`\``;

        return {
          content: [
            {
              type: 'text' as const,
              text: map
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **Error generating tree**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
