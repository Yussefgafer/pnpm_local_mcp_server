import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';

import * as os from 'os';

// Get username
export const username: string = os.userInfo().username;

/**
 * Tool 1: Count files in directory
 * Registers the tool to the MCP server
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'count-files',
    {
      title: 'Count Files',
      description:
        'Count files in the specified directory. Parameters: folderPath (optional) - directory path, defaults to desktop',
      inputSchema: {
        folderPath: z.string().optional()
      }
    },
    async ({ folderPath }) => {
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
        const fileCount = items.length;

        return {
          content: [
            {
              type: 'text',
              text: `Directory ${targetPath} contains ${fileCount} file(s)/folder(s)`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error counting files: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
