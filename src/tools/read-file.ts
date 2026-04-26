import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import { getFileMetadata, formatFileSize, FileMetadata, validatePath } from '../utils';

/**
 * Tool: Read File
 * Reads the content of a text file with safety limits to prevent context overflow.
 * Detects binary files efficiently using 8KB sample. Returns statistics for large files.
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'read-file',
    {
      title: 'Read File',
      description:
        'Reads the content of a text file. If the file exceeds maxChars (default 10000), only the first maxChars characters are returned with file statistics. Binary files (detected via null bytes in 8KB sample) will be rejected.',
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
        // Security: Validate path is within allowed directories
        const pathError = validatePath(filePath);
        if (pathError) return pathError;

        // Get comprehensive metadata using utils
        const metadata: FileMetadata = await getFileMetadata(filePath);

        // Check if file exists
        if (!metadata.exists) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: File does not exist: \`${filePath}\``
              }
            ],
            isError: true
          };
        }

        // Check if it's a file (not directory)
        if (!metadata.isFile) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Path is not a file: \`${filePath}\`\n\nType: ${metadata.isDirectory ? 'directory' : 'other'}`
              }
            ],
            isError: true
          };
        }

        // Check if file is readable
        if (!metadata.isReadable) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: File is not readable (permission denied): \`${filePath}\``
              }
            ],
            isError: true
          };
        }

        // Check if binary (detected via 8KB sample in getFileMetadata)
        if (metadata.isBinary) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: File appears to be binary (contains null bytes).\n\n**File**: \`${filePath}\`\n**Size**: ${formatFileSize(metadata.size)}\n\nBinary files (images, PDFs, executables) are not supported for reading as text.`
              }
            ],
            isError: true
          };
        }

        // Read file content
        const content = await fs.readFile(filePath, encoding as BufferEncoding);
        const totalChars = content.length;
        const totalLines = content.split('\n').length;

        // Check if content exceeds maxChars
        if (totalChars > maxChars) {
          const truncated = content.substring(0, maxChars);
          return {
            content: [
              {
                type: 'text' as const,
                text: `${truncated}\n\n---\n📊 **File Statistics**\n- **Lines**: ${totalLines}\n- **Characters**: ${totalChars}\n- **Size**: ${formatFileSize(metadata.size)}\n- **Showing**: First ${maxChars} characters\n- **Truncated**: ${totalChars - maxChars} characters hidden`
              }
            ]
          };
        }

        // Return full content with statistics
        return {
          content: [
            {
              type: 'text' as const,
              text: `${content}\n\n---\n📊 **File Statistics**\n- **Lines**: ${totalLines}\n- **Characters**: ${totalChars}\n- **Size**: ${formatFileSize(metadata.size)}`
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **Error reading file**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
