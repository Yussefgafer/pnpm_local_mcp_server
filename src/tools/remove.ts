import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import { formatFileSize } from '../utils';

/**
 * Tool: Remove File or Directory
 * Removes a file or directory with automatic type detection.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'remove',
    {
      title: 'Remove File or Directory',
      description:
        'Removes (deletes) a file or directory. Automatically detects the type. Use recursive=true for non-empty directories.',
      inputSchema: {
        path: z.string().describe('The path of the file or directory to remove.'),
        recursive: z.boolean().optional().default(true).describe('For directories: delete contents recursively. For files: ignored.'),
      }
    },
    async ({
      path: targetPath,
      recursive = true,
    }) => {
      try {
        // Check if the path exists
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

        // Get stats to determine if it's a file or directory
        const stats = await fs.stat(targetPath);
        const isDirectory = stats.isDirectory();
        const isFile = stats.isFile();
        const size = stats.size;

        if (isDirectory) {
          // It's a directory - check recursive flag
          if (!recursive) {
            const files = await fs.readdir(targetPath);
            if (files.length > 0) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `❌ **Error**: Directory is not empty: \`${targetPath}\`\n\nUse \`recursive: true\` to remove it with all contents.`
                  }
                ],
                isError: true
              };
            }
          }

          await fs.remove(targetPath);

          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ **Successfully removed directory**: \`${targetPath}\``
              }
            ]
          };
        } else if (isFile) {
          // It's a file
          await fs.remove(targetPath);

          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ **Successfully removed file**: \`${targetPath}\` (${formatFileSize(size)})`
              }
            ]
          };
        } else {
          // It's neither (symlink, socket, etc.)
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Path is neither a file nor a directory: \`${targetPath}\`\n\nMay be a symlink or special file.`
              }
            ],
            isError: true
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **Error removing path**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
