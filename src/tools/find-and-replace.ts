import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import { validatePath, getFileMetadata } from '../utils';

interface Change {
  lineNumber: number;
  oldLine: string;
  newLine: string;
}

/**
 * Find all changed lines between old and new content
 */
function findChanges(oldLines: string[], newLines: string[]): Change[] {
  const changes: Change[] = [];
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] ?? '';
    const newLine = newLines[i] ?? '';

    if (oldLine !== newLine) {
      changes.push({
        lineNumber: i + 1, // 1-based line numbers
        oldLine,
        newLine,
      });
    }
  }

  return changes;
}

/**
 * Format changes as a git-style diff
 */
function formatDiff(path: string, changes: Change[], search: string, replace: string): string {
  if (changes.length === 0) {
    return '**No changes**: The search term was not found in the file.';
  }

  let result = `**Changes in \`${path}\`**\n\n`;
  result += `**Summary**: ${changes.length} line(s) modified\n\n`;
  result += '```diff\n';

  for (const change of changes) {
    // Show context: old line with -
    result += `- ${change.oldLine}\n`;
    // Show new line with +
    result += `+ ${change.newLine}\n`;
    // Add line number indicator
    result += `  (Line ${change.lineNumber})\n`;
  }

  result += '```\n\n';
  result += `**Replaced**: \`${search}\` → \`${replace}\``;

  return result;
}

export default function findAndReplace(server: McpServer) {
  server.registerTool(
    'find-and-replace',
    {
      title: 'Find and Replace in File',
      description: 'Finds and replaces text in a file using a string or a regular expression. Returns a diff showing changed lines with line numbers.',
      inputSchema: {
        path: z.string().describe('The path to the file to modify.'),
        search: z.string().describe('The text or regex pattern to search for.'),
        replace: z.string().describe('The text to replace the search term with.'),
        isRegex: z.boolean().optional().default(false).describe('Set to true if the search term is a regular expression.'),
        replaceAll: z.boolean().optional().default(true).describe('Set to false to replace only the first occurrence.'),
      },
    },
    async (params: { path: string; search: string; replace: string; isRegex?: boolean; replaceAll?: boolean }) => {
      try {
        // Security: Validate path is within allowed directories
        const pathError = validatePath(params.path);
        if (pathError) return pathError;

        // Check file exists and size
        const metadata = await getFileMetadata(params.path);
        if (!metadata.exists) {
          return { content: [{ type: 'text', text: `**Error**: File does not exist: \`${params.path}\`` }], isError: true };
        }

        // Prevent memory issues with huge files (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (metadata.size > MAX_FILE_SIZE) {
          return { content: [{ type: 'text', text: `**Error**: File is too large (${(metadata.size / 1024 / 1024).toFixed(1)} MB). Maximum size for find-and-replace is 10 MB.` }], isError: true };
        }

        const fileContent = await fs.readFile(params.path, 'utf-8');
        const oldLines = fileContent.split('\n');
        let newContent: string;

        if (params.isRegex) {
          let regex: RegExp;
          try {
            regex = new RegExp(params.search, params.replaceAll ? 'g' : '');
          } catch (e: any) {
            return { content: [{ type: 'text', text: `**Error**: Invalid regex pattern: ${e.message}` }], isError: true };
          }
          newContent = fileContent.replace(regex, params.replace);
        } else {
          if (params.replaceAll) {
            newContent = fileContent.split(params.search).join(params.replace);
          } else {
            newContent = fileContent.replace(params.search, params.replace);
          }
        }

        const newLines = newContent.split('\n');
        const changes = findChanges(oldLines, newLines);

        if (changes.length === 0) {
          return { content: [{ type: 'text', text: '**No changes**: The search term was not found in the file.' }] };
        }

        await fs.writeFile(params.path, newContent, 'utf-8');

        const diffOutput = formatDiff(params.path, changes, params.search, params.replace);

        return { content: [{ type: 'text', text: diffOutput }] };

      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `**Error**: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
