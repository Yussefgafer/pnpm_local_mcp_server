import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';

/**
 * Tool: Read File
 * Reads the content of a text file with safety limits to prevent context overflow.
 * Returns statistics if the file exceeds the character limit.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'read-file',
    {
      title: 'Read File',
      description:
        'Reads the content of a text file. If the file exceeds maxChars (default 10000), only the first maxChars characters are returned with file statistics. Binary files (images, PDFs, etc.) will be rejected. Line count statistics are provided for all files.',
      inputSchema: {
        filePath: z.string().describe('The path of the file to read.'),
        maxChars: z.number().int().positive().optional().default(10000).describe('Maximum characters to read (default: 10000).'),
        encoding: z.string().optional().default('utf-8').describe('File encoding (default: utf-8).'),
      }
    },
    async ({
      filePath,
      maxChars = 10000,
      encoding = 'utf-8',
    }) => {
      try {
        // Check if file exists
        if (!(await fs.pathExists(filePath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: File does not exist: ${filePath}`
              }
            ],
            isError: true
          };
        }

        // Check if it's a file
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Path is not a file: ${filePath}`
              }
            ],
            isError: true
          };
        }

        // Try to detect binary files by reading first few bytes
        const buffer = await fs.readFile(filePath);
        const isBinary = buffer.slice(0, 8000).some((byte) => byte === 0);

        if (isBinary) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: File appears to be binary (contains null bytes). File size: ${stats.size} bytes. Reading binary files is not supported.`
              }
            ],
            isError: true
          };
        }

        // Read as text
        const content = buffer.toString(encoding as BufferEncoding);
        const totalChars = content.length;
        const totalLines = content.split('\n').length;

        // Check if content exceeds maxChars
        if (totalChars > maxChars) {
          const truncated = content.substring(0, maxChars);
          return {
            content: [
              {
                type: 'text' as const,
                text: `${truncated}\n\n[File truncated] Total lines: ${totalLines}, Total characters: ${totalChars}, File size: ${stats.size} bytes. Only showing first ${maxChars} characters.`
              }
            ]
          };
        }

        // Return full content with statistics
        return {
          content: [
            {
              type: 'text' as const,
              text: `${content}\n\n[File statistics] Lines: ${totalLines}, Characters: ${totalChars}, Size: ${stats.size} bytes`
            }
          ]
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error reading file: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
