import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

import * as os from 'os';

// Get username
export const username: string = os.userInfo().username;

/**
 * Tool 2: Get file list
 * Registers the tool to the MCP server
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'list-files',
    {
      title: 'List Files',
      description:
        'Get all file names in the specified directory. Parameters: folderPath (optional) - directory path, defaults to desktop; includeHidden (optional) - include hidden files, defaults to false',
      inputSchema: {
        folderPath: z.string().optional(),
        includeHidden: z.boolean().optional()
      }
    },
    async ({ folderPath, includeHidden = false }) => {
      try {
        // Default to desktop path
        const targetPath = folderPath || `/Users/${username}/Desktop`;

        // Check if path exists
        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Path ${targetPath} does not exist`
              }
            ],
            isError: true
          };
        }

        // Read directory
        const items = await fs.readdir(targetPath);

        // Filter hidden files
        const filteredItems = includeHidden
          ? items
          : items.filter((item) => !item.startsWith('.'));

        // Get detailed information
        const fileDetails = await Promise.all(
          filteredItems.map(async (item) => {
            const itemPath = path.join(targetPath, item);
            const stats = await fs.stat(itemPath);
            return {
              name: item,
              type: stats.isDirectory() ? 'Directory' : 'File',
              size: stats.isFile() ? `${Math.round(stats.size / 1024)}KB` : '-'
            };
          })
        );

        const resultText =
          fileDetails.length > 0
            ? `Contents of directory ${targetPath}:\n` +
              fileDetails
                .map((item) => `- ${item.name} (${item.type}, ${item.size})`)
                .join('\n')
            : `Directory ${targetPath} is empty`;

        return {
          content: [
            {
              type: 'text',
              text: resultText
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting file list: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
