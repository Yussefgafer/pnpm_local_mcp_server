import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ensureTmpDir, cleanupTmp } from '../utils';

// Core file operations
import countFiles from './count-files';
import listFiles from './list-files';
import copyFiles from './copy-files';
import moveFiles from './move-files';
import removeItem from './remove';
import createItem from './create-item';
import readFile from './read-file';
import writeFile from './write-file';

// Search and analysis
import tree from './tree';
import grep from './grep';
import glob from './glob';

// System and utilities
import executeCommand from './execute-command';
import findAndReplace from './find-and-replace';
import makeHttpRequest from './http-request';

/**
 * Initialize tmp directory and cleanup
 * Called once at server startup
 */
export async function initializeTools(): Promise<void> {
  try {
    // Ensure tmp directory exists
    await ensureTmpDir();

    // Cleanup old tmp files (keep last 200)
    const result = await cleanupTmp(200);
    if (result.deleted > 0) {
      console.error(`[init] Cleaned up ${result.deleted} old tmp files`);
    }
  } catch (error) {
    console.error('[init] Failed to initialize tmp directory:', error);
  }
}

/**
 * Register all tools with the MCP server
 */
export default function registerTools(server: McpServer) {
  const tools = [
    // Core file operations
    countFiles,
    listFiles,
    copyFiles,
    moveFiles,
    removeItem,
    createItem,
    readFile,
    writeFile,

    // Search and analysis
    tree,
    grep,
    glob,

    // System and utilities
    executeCommand,
    findAndReplace,
    makeHttpRequest,
  ];

  tools.forEach((registryFn) => {
    if (typeof registryFn === 'function') {
      registryFn(server);
    } else {
      console.error('An imported tool is not a function:', registryFn);
    }
  });

  console.log(`${tools.length} tools have been registered.`);
}
