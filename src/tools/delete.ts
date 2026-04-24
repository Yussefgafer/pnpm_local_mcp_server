import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

/**
 * Tool: Delete File or Directory
 * Deletes a file or directory with automatic type detection
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'delete',
    {
      title: 'Delete File or Directory',
      description:
        'Deletes a file or directory. The tool automatically detects whether the path is a file or directory. If you try to delete a file but the path is a directory (or vice versa), an error will be returned explaining the mismatch. Use recursive=true for non-empty directories.',
      inputSchema: {
        path: z.string().describe('The path of the file or directory to delete.'),
        recursive: z.boolean().optional().default(true).describe('For directories: whether to delete contents recursively. For files: this parameter is ignored.'),
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
                type: 'text',
                text: `Error: Path does not exist: ${targetPath}`
              }
            ],
            isError: true
          };
        }

        // Get stats to determine if it's a file or directory
        const stats = await fs.stat(targetPath);
        const isDirectory = stats.isDirectory();
        const isFile = stats.isFile();

        if (isDirectory) {
          // It's a directory - check recursive flag
          if (!recursive) {
            const files = await fs.readdir(targetPath);
            if (files.length > 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error: Directory ${targetPath} is not empty. Use recursive: true to delete it with all contents.`
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
                type: 'text',
                text: `Successfully deleted directory: ${targetPath}`
              }
            ]
          };
        } else if (isFile) {
          // It's a file
          await fs.remove(targetPath);

          return {
            content: [
              {
                type: 'text',
                text: `Successfully deleted file: ${targetPath}`
              }
            ]
          };
        } else {
          // It's neither (symlink, socket, etc.)
          return {
            content: [
              {
                type: 'text',
                text: `Error: Path ${targetPath} is neither a file nor a directory (may be a symlink or special file).`
              }
            ],
            isError: true
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting path: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
