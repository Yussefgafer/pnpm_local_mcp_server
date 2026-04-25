import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';
import fg from 'fast-glob';

/**
 * Tool: Glob - Find Files by Pattern
 * Uses fast-glob for efficient pattern matching.
 * @param server MCP server instance
 */

const registerTool = (server: McpServer) => {
  server.registerTool(
    'glob',
    {
      title: 'Glob - Find Files by Pattern',
      description:
        'Finds files matching a glob pattern using fast-glob. Supports ** for recursive matching, * for wildcards, and brace expansion. Returns array of file paths.',
      inputSchema: {
        pattern: z.union([z.string(), z.array(z.string())]).describe('Glob pattern(s) to match files (e.g., "src/**/*.ts", "*.json", or ["*.js", "*.ts"]).'),
        cwd: z.string().optional().default('.').describe('Base directory for search (default: current directory).'),
        ignore: z.array(z.string()).optional().default(['node_modules/**', '.git/**', 'dist/**']).describe('Patterns to ignore (default: ["node_modules/**", ".git/**", "dist/**"]).'),
        absolute: z.boolean().optional().default(true).describe('Return absolute paths (default: true) or relative paths.'),
        dot: z.boolean().optional().default(false).describe('Include hidden files (starting with .) in results (default: false).'),
      }
    },
    async ({
      pattern,
      cwd = '.',
      ignore = ['node_modules/**', '.git/**', 'dist/**'],
      absolute = true,
      dot = false,
    }) => {
      try {
        // Validate pattern
        if (!pattern || (Array.isArray(pattern) && pattern.length === 0)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: '❌ **Error**: pattern is required'
              }
            ],
            isError: true
          };
        }

        // Resolve base path
        const basePath = path.resolve(cwd);

        // Check if path exists
        if (!(await fs.pathExists(basePath))) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ **Error**: Directory does not exist: \`${basePath}\``
              }
            ],
            isError: true
          };
        }

        // Use fast-glob for efficient pattern matching
        const results = await fg(pattern, {
          cwd: basePath,
          ignore,
          absolute,
          dot,
          onlyFiles: true,
          followSymbolicLinks: false,
        });

        // Sort results for consistency
        results.sort();

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `ℹ️ **No files found** matching pattern(s) "${Array.isArray(pattern) ? pattern.join(', ') : pattern}" in \`${basePath}\``
              }
            ]
          };
        }

        // Format output
        let output = `📁 **Found ${results.length} file(s)** matching "${Array.isArray(pattern) ? pattern.join(', ') : pattern}":\n\n`;
        output += results.join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: output
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ **Error during search**: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

export default registerTool;
