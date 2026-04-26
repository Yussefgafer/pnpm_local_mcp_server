import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fsPromises from 'fs/promises';
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

        // Read only up to maxChars for performance (avoid loading huge files into memory)
        const maxBytesToRead = Math.min(maxChars * 4, metadata.size); // Estimate: 4 bytes per char max for UTF-8
        const fd = await fsPromises.open(filePath, 'r');
        let content: string;
        let truncated = false;

        try {
          // Read buffer up to estimated size
          const buffer = Buffer.alloc(maxBytesToRead);
          const { bytesRead } = await fd.read(buffer, 0, maxBytesToRead, 0);

          // Convert to string with proper encoding
          content = buffer.toString(encoding as BufferEncoding, 0, bytesRead);

          // If content is longer than maxChars, truncate it
          if (content.length > maxChars) {
            content = content.substring(0, maxChars);
            truncated = true;
          }
        } finally {
          await fd.close();
        }

        const totalChars = content.length;
        const totalLines = content.split('\n').length;
        const isTruncated = truncated || metadata.size > maxBytesToRead;

        // Return content with statistics
        return {
          content: [
            {
              type: 'text' as const,
              text: isTruncated
                ? `${content}\n\n---\n📊 **File Statistics**\n- **Lines**: ${totalLines}\n- **Characters**: ${totalChars}\n- **Size**: ${formatFileSize(metadata.size)}\n- **Showing**: First ${maxChars} characters\n- **Truncated**: ${metadata.size > maxBytesToRead ? 'Yes (file partially read)' : `${content.length - maxChars} characters`}`
                : `${content}\n\n---\n📊 **File Statistics**\n- **Lines**: ${totalLines}\n- **Characters**: ${totalChars}\n- **Size**: ${formatFileSize(metadata.size)}`
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
