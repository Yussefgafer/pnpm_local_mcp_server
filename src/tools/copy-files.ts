import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs-extra';
import * as path from 'path';

/**
 * Tool: Copy Files or Directories
 * Registers the tool to the MCP server
 * @param server MCP server instance
 */
const registerTool = (server: McpServer) => {
  server.registerTool(
    'copy-files',
    {
      title: 'Copy Files',
      description:
        'Copy files or directories to a target location. Parameters: sourcePath - source file/directory path (required); targetPath - target path (required); overwrite - whether to overwrite existing files (optional, default false); preserveTimestamps - whether to preserve timestamps (optional, default true)',
      inputSchema: {
        sourcePath: z.string(),
        targetPath: z.string(),
        overwrite: z.boolean().optional(),
        preserveTimestamps: z.boolean().optional()
      }
    },
    async ({
      sourcePath,
      targetPath,
      overwrite = false,
      preserveTimestamps = true
    }) => {
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

        // Get source file information
        const sourceStats = await fs.stat(sourcePath);
        const isDirectory = sourceStats.isDirectory();
        const sourceSize = isDirectory
          ? await calculateDirectorySize(sourcePath)
          : sourceStats.size;

        // Ensure target directory exists
        const targetDir = isDirectory ? targetPath : path.dirname(targetPath);
        await fs.ensureDir(targetDir);

        // Execute copy operation
        const copyOptions: any = {
          overwrite: overwrite,
          preserveTimestamps: preserveTimestamps
        };

        await fs.copy(sourcePath, targetPath, copyOptions);

        // Verify copy was successful
        if (!(await fs.pathExists(targetPath))) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Copy operation completed but target file not found'
              }
            ],
            isError: true
          };
        }

        // Verify copied file
        await fs.stat(targetPath);

        // Count files (if directory)
        let fileCount = 1;
        if (isDirectory) {
          fileCount = await countFilesInDirectory(targetPath);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Copy completed!\nSource: ${sourcePath}\nTarget: ${targetPath}\nType: ${isDirectory ? 'Directory' : 'File'}\nSize: ${Math.round(sourceSize / 1024)}KB\n${isDirectory ? `Files included: ${fileCount}` : ''}\nPreserve timestamps: ${preserveTimestamps ? 'Yes' : 'No'}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error copying file: ${error instanceof Error ? error.message : String(error)}`
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
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory()) {
      const items = await fs.readdir(itemPath);
      for (const item of items) {
        await calculateSize(path.join(itemPath, item));
      }
    } else {
      totalSize += stats.size;
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
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory()) {
      const items = await fs.readdir(itemPath);
      for (const item of items) {
        await countFiles(path.join(itemPath, item));
      }
    } else {
      fileCount++;
    }
  };

  await countFiles(dirPath);
  return fileCount;
}

export default registerTool;
