import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import {
  getDefaultPath,
  getDirectoryStats,
  formatFileSize,
  DirectoryStats
} from '../utils';

/**
 * Tool: Count Files and Directories
 * Provides comprehensive statistics about a directory (files, directories, size, by extension)
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'count-files',
    {
      title: 'Count Files and Directories',
      description:
        'Counts files and directories in the specified path, providing detailed statistics including total size and file breakdown by extension. Defaults to Desktop if no path is provided.',
      inputSchema: {
        folderPath: z.string().optional().describe('Directory path to analyze. Defaults to Desktop.'),
        maxDepth: z.number().int().positive().optional().default(10).describe('Maximum depth to traverse (default: 10).')
      }
    },
    async ({ folderPath, maxDepth = 10 }) => {
      try {
        // Use cross-platform default path
        const targetPath = folderPath || getDefaultPath();

        // Check if path exists
        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Error: Path does not exist: ${targetPath}`
              }
            ],
            isError: true
          };
        }

        // Get comprehensive stats using utils
        const stats: DirectoryStats = await getDirectoryStats(targetPath, {
          maxDepth,
          ignore: ['node_modules', '.git', 'dist', '.svn', '.hg']
        });

        // Build the report
        let report = `**Project**: ${targetPath}\n\n`;
        report += `**Summary**:\n`;
        report += `- Files: ${stats.fileCount}\n`;
        report += `- Directories: ${stats.dirCount}\n`;
        report += `- Total Size: ${formatFileSize(stats.totalSize)}\n`;
        report += `- Max Depth: ${stats.maxDepth}\n`;

        // Add breakdown by extension if there are files
        if (stats.fileCount > 0 && Object.keys(stats.byExtension).length > 0) {
          report += `\n**By Extension**:\n`;

          // Sort extensions by count (descending)
          const sortedExtensions = Object.entries(stats.byExtension)
            .sort(([, a], [, b]) => b - a);

          for (const [ext, count] of sortedExtensions.slice(0, 15)) {
            report += `- ${ext}: ${count}\n`;
          }

          if (sortedExtensions.length > 15) {
            report += `- ... and ${sortedExtensions.length - 15} more\n`;
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: report
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ Error analyzing directory: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
