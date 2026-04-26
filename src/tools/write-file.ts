import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';
import { saveToTmp, checkWritePermission, formatFileSize, validatePath } from '../utils';

/**
 * Tool: Write File
 * Writes content to a new file. Fails if file exists and saves content to tmp folder.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'write-file',
    {
      title: 'Write File',
      description:
        'Writes content to a file only if it does NOT already exist. If the file exists or any error occurs, the content is saved to a temporary file in tmp/ and the path is returned in the error message.',
      inputSchema: {
        filePath: z.string().describe('The path of the file to write to.'),
        content: z.string().describe('The content to write (string). For binary content, use base64 encoding.'),
        encoding: z.enum(['utf-8', 'utf8', 'ascii', 'base64', 'latin1', 'hex']).optional().default('utf-8').describe('File encoding for content (default: utf-8). Use "base64" for binary data.'),
      }
    },
    async ({
      filePath,
      content,
      encoding = 'utf-8',
    }) => {
      try {
        // Security: Validate path is within allowed directories
        const pathError = validatePath(filePath);
        if (pathError) return pathError;

        // Validate filePath is not empty
        if (!filePath || filePath.trim() === '') {
          const tmpPath = await saveToTmp(
            content,
            'empty file path'
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: filePath is required and cannot be empty.\n\n**Content saved to**: \`${tmpPath}\``
              }
            ],
            isError: true
          };
        }

        // Ensure parent directory exists
        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);

        // Check write permission before attempting
        if (!(await checkWritePermission(filePath))) {
          const tmpPath = await saveToTmp(
            content,
            'insufficient permissions'
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Insufficient permissions to write to: \`${filePath}\`\n\n**Content saved to**: \`${tmpPath}\``
              }
            ],
            isError: true
          };
        }

        // Check if file already exists
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          if (stats.isDirectory()) {
            const tmpPath = await saveToTmp(
              content,
              'path is a directory'
            );
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `❌ **Error**: Path is a directory, not a file: \`${filePath}\`\n\n**Content saved to**: \`${tmpPath}\``
                }
              ],
              isError: true
            };
          }

          // File exists
          const tmpPath = await saveToTmp(
            content,
            'file already exists'
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: File already exists at: \`${filePath}\`\n\n**Content saved to**: \`${tmpPath}\``
              }
            ],
            isError: true
          };
        }

        // Write the file
        const writeOptions = { encoding: encoding as BufferEncoding };
        await fs.writeFile(filePath, content, writeOptions);

        // Calculate size for display
        const size = encoding === 'base64'
          ? Buffer.byteLength(content, 'base64')
          : Buffer.byteLength(content, encoding as BufferEncoding);

        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ **Successfully wrote** ${formatFileSize(size)} to \`${filePath}\``
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Any other error - save to tmp
        const tmpPath = await saveToTmp(
          content,
          `error: ${errorMessage}`
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **Error writing file**: ${errorMessage}\n\n**Content saved to**: \`${tmpPath}\``
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
