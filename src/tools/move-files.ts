import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

/**
 * Tool: Move Files or Directories
 * Registers the tool to the MCP server
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'move-files',
    {
      title: 'Move Files',
      description:
        'Move files or directories to a target location. Parameters: sourcePath - source file/directory path (required); targetPath - target path (required); overwrite - whether to overwrite existing files (optional, default false)',
      inputSchema: {
        sourcePath: z.string(),
        targetPath: z.string(),
        overwrite: z.boolean().optional()
      }
    },
    async ({ sourcePath, targetPath, overwrite = false }) => {
      try {
        // Check if source file exists
        if (!(await fs.pathExists(sourcePath))) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Source file or directory ${sourcePath} does not exist`
              }
            ],
            isError: true
          };
        }

        // Check if source and target paths are the same
        const absoluteSource = path.resolve(sourcePath);
        const absoluteTarget = path.resolve(targetPath);
        if (absoluteSource === absoluteTarget) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Source and target paths cannot be the same'
              }
            ],
            isError: true
          };
        }

        // Check if target already exists
        const targetExists = await fs.pathExists(targetPath);
        if (targetExists && !overwrite) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Target path ${targetPath} already exists, set overwrite=true to overwrite`
              }
            ],
            isError: true
          };
        }

        // Get source file information (before move)
        const sourceStats = await fs.stat(sourcePath);
        const isDirectory = sourceStats.isDirectory();
        const sourceSize = isDirectory
          ? await calculateDirectorySize(sourcePath)
          : sourceStats.size;

        // Count files (if directory)
        let fileCount = 1;
        if (isDirectory) {
          fileCount = await countFilesInDirectory(sourcePath);
        }

        // Ensure target directory exists
        const targetDir = isDirectory
          ? path.dirname(targetPath)
          : path.dirname(targetPath);
        await fs.ensureDir(targetDir);

        // Execute move operation
        await fs.move(sourcePath, targetPath, { overwrite: overwrite });

        // Verify move was successful
        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Move operation completed but target file not found'
              }
            ],
            isError: true
          };
        }

        // Verify source file was removed
        if (await fs.pathExists(sourcePath)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Warning: Move operation completed but source file still exists'
              }
            ],
            isError: true
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Move completed!\nSource: ${sourcePath}\nTarget: ${targetPath}\nType: ${isDirectory ? 'Directory' : 'File'}\nSize: ${Math.round(sourceSize / 1024)}KB\n${isDirectory ? `Files included: ${fileCount}` : ''}\nOperation: ${targetExists && overwrite ? 'Overwrite move' : 'New move'}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error moving file: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};

/**
 * Calculate directory size
 */
async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  const calculateSize = async (itemPath: string): Promise<void> => {
    try {
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        const items = await fs.readdir(itemPath);
        for (const item of items) {
          await calculateSize(path.join(itemPath, item));
        }
      } else {
        totalSize += stats.size;
      }
    } catch {
      // Ignore inaccessible files
    }
  };

  await calculateSize(dirPath);
  return totalSize;
}

/**
 * Count files in directory
 */
async function countFilesInDirectory(dirPath: string): Promise<number> {
  let fileCount = 0;

  const countFiles = async (itemPath: string): Promise<void> => {
    try {
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        const items = await fs.readdir(itemPath);
        for (const item of items) {
          await countFiles(path.join(itemPath, item));
        }
      } else {
        fileCount++;
      }
    } catch {
      // Ignore inaccessible files
    }
  };

  await countFiles(dirPath);
  return fileCount;
}

export default registerTool;
