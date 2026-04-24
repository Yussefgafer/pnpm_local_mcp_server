import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

/**
 * Tool: Create Item (File or Directory)
 * Creates a new file or directory. Specify the type parameter to indicate whether to create a file or directory.
 * For files, you can optionally provide initial content. For directories, the operation creates the full path.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'create-item',
    {
      title: 'Create File or Directory',
      description:
        'Creates a new file or directory at the specified path. Use type="file" to create a file (optionally with content) or type="directory" to create a folder. If overwrite=false (default) and the path already exists, an error is returned.',
      inputSchema: {
        path: z.string().describe('The path where the file or directory should be created.'),
        type: z.enum(['file', 'directory']).describe('The type of item to create: "file" or "directory".'),
        content: z.string().optional().describe('Initial content for the file (only used when type="file").'),
        encoding: z.string().optional().default('utf-8').describe('File encoding when writing content (only for type="file").'),
        overwrite: z.boolean().optional().default(false).describe('If false, returns an error if the path already exists.'),
      }
    },
    async ({
      path: targetPath,
      type,
      content,
      encoding,
      overwrite,
    }) => {
      try {
        if (!targetPath) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: path is required for create-item operation'
              }
            ],
            isError: true
          };
        }

        // Check if path already exists
        if (await fs.pathExists(targetPath)) {
          if (!overwrite) {
            const stats = await fs.stat(targetPath);
            const existingType = stats.isDirectory() ? 'directory' : 'file';
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${existingType} already exists at ${targetPath}. Use overwrite: true to replace it.`
                }
              ],
              isError: true
            };
          }

          // If overwrite is true, remove existing item first
          await fs.remove(targetPath);
        }

        // Create based on type
        if (type === 'directory') {
          // Create directory
          await fs.ensureDir(targetPath);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully created directory: ${targetPath}`
              }
            ]
          };
        } else {
          // Create file
          const dir = path.dirname(targetPath);
          await fs.ensureDir(dir);

          const fileContent = content ?? '';
          await fs.writeFile(targetPath, fileContent, encoding as BufferEncoding);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully created file: ${targetPath}${content !== undefined ? ` with ${content.length} characters` : ''}`
              }
            ]
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating ${type}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
