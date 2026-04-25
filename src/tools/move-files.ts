import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';
import {
  calculateDirectorySize,
  countFilesInDirectory,
  formatFileSize,
  checkWritePermission,
  getDirectoryStats
} from '../utils';

/**
 * Tool: Move Files or Directories
 * Uses utils for directory operations and formatting.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'move-files',
    {
      title: 'Move Files or Directories',
      description:
        'Moves files or directories to a target location. Supports overwrite mode. Uses atomic operations when possible.',
      inputSchema: {
        sourcePath: z.string().describe('Source file or directory path (required).'),
        targetPath: z.string().describe('Target path (required).'),
        overwrite: z.boolean().optional().default(false).describe('Whether to overwrite existing target (default: false).'),
      }
    },
    async ({ sourcePath, targetPath, overwrite = false }) => {
      try {
        // Check if source exists
        if (!(await fs.pathExists(sourcePath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Source does not exist: \`${sourcePath}\``
              }
            ],
            isError: true
          };
        }

        // Check if source and target paths are the same
        const absoluteSource = path.resolve(sourcePath);
        const absoluteTarget = path.resolve(targetPath);
        if (absoluteSource === absoluteTarget) {
          return {
            content: [
              {
                type: 'text' as const,
                text: '❌ **Error**: Source and target paths cannot be the same'
              }
            ],
            isError: true
          };
        }

        // Check target write permissions
        const targetDir = path.dirname(targetPath);
        if (!(await checkWritePermission(targetDir))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Insufficient permissions to write to: \`${targetDir}\``
              }
            ],
            isError: true
          };
        }

        // Check if target already exists
        const targetExists = await fs.pathExists(targetPath);
        if (targetExists && !overwrite) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Target already exists: \`${targetPath}\`\n\nUse \`overwrite: true\` to replace it.`
              }
            ],
            isError: true
          };
        }

        // Get source stats
        const sourceStats = await fs.stat(sourcePath);
        const isDirectory = sourceStats.isDirectory();

        // Get comprehensive stats using utils
        let itemCount = 1;
        let sourceSize = sourceStats.size;

        if (isDirectory) {
          const dirStats = await getDirectoryStats(sourcePath, {
            maxDepth: Infinity,
            ignore: ['node_modules', '.git', 'dist']
          });
          sourceSize = dirStats.totalSize;
          itemCount = dirStats.fileCount;
        }

        // Ensure target directory exists
        await fs.ensureDir(targetDir);

        // Execute move operation
        await fs.move(sourcePath, targetPath, { overwrite });

        // Build success message
        let result = `✅ **Move Completed**\n\n`;
        result += `**Source**: \`${sourcePath}\`\n`;
        result += `**Target**: \`${targetPath}\`\n`;
        result += `**Type**: ${isDirectory ? 'Directory' : 'File'}\n`;
        result += `**Size**: ${formatFileSize(sourceSize)}\n`;
        if (isDirectory) {
          result += `**Files**: ${itemCount}\n`;
        }
        result += `**Mode**: ${targetExists && overwrite ? 'Overwrite' : 'New'}`;

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
              text: `❌ **Error moving file**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
