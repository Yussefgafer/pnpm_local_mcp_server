import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Get project root directory for tmp folder
const PROJECT_ROOT = path.resolve(process.cwd());
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');

/**
 * Saves content to tmp directory with UUID when errors occur
 * @param content The content to save
 * @param reason The error reason for logging
 * @returns The path where content was saved
 */
async function saveToTmp(content: string | Buffer, reason: string): Promise<string> {
  await fs.ensureDir(TMP_DIR);
  const uuid = randomUUID();
  const filename = `${uuid}.txt`;
  const tmpPath = path.join(TMP_DIR, filename);

  await fs.writeFile(tmpPath, content);
  console.error(`[write-file] Content saved to tmp due to error (${reason}): ${tmpPath}`);

  return `tmp/${filename}`;
}

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
        'Writes content to a file only if it does NOT already exist. If the file exists or any error occurs, the content is saved to a temporary file in tmp/{uuid}.txt and the path is returned in the error message.',
      inputSchema: {
        filePath: z.string().describe('The path of the file to write to.'),
        content: z.union([z.string(), z.instanceof(Buffer)]).describe('The content to write (string or Buffer).'),
        encoding: z.string().optional().default('utf-8').describe('File encoding for text content (default: utf-8).'),
      }
    },
    async ({
      filePath,
      content,
      encoding = 'utf-8',
    }) => {
      try {
        // Validate filePath
        if (!filePath || filePath.trim() === '') {
          const tmpPath = await saveToTmp(
            content instanceof Buffer ? content.toString('base64') : content,
            'empty file path'
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: filePath is required and cannot be empty.\nYour content has been saved to: ${tmpPath}`
              }
            ],
            isError: true
          };
        }

        // Ensure parent directory exists
        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);

        // Check if file already exists
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          if (stats.isDirectory()) {
            const tmpPath = await saveToTmp(
              content instanceof Buffer ? content.toString('base64') : content,
              'path is a directory'
            );
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: Path is a directory, not a file: ${filePath}\nYour content has been saved to: ${tmpPath}`
                }
              ],
              isError: true
            };
          }

          // File exists
          const tmpPath = await saveToTmp(
            content instanceof Buffer ? content.toString('base64') : content,
            'file already exists'
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: File already exists at: ${filePath}\nYour content has been saved to: ${tmpPath}`
              }
            ],
            isError: true
          };
        }

        // Write the file
        const writeOptions = { encoding: encoding as BufferEncoding };
        await fs.writeFile(filePath, content, writeOptions);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Successfully wrote ${content instanceof Buffer ? `${content.length} bytes` : `${content.length} characters`} to ${filePath}`
            }
          ]
        };
      } catch (error: any) {
        // Any other error - save to tmp
        const tmpPath = await saveToTmp(
          content instanceof Buffer ? content.toString('base64') : content,
          `error: ${error.message}`
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error writing file: ${error.message}\nYour content has been saved to: ${tmpPath}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
