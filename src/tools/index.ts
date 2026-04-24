import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Existing tools
import countFiles from './count-files';
import listFiles from './list-files';
import copyFiles from './copy-files';
import moveFiles from './move-files';

// New tools
import deleteItem from './delete';
import createItem from './create-item';
import readFile from './read-file';
import writeFile from './write-file';
import executeCommand from './execute-command';
import findAndReplace from './find-and-replace';
import generateProjectMap from './map';
import makeHttpRequest from './http-request';
import grep from './grep';
import glob from './glob';

export default function registryTools(server: McpServer) {
  const tools = [
    // Existing tools
    countFiles,
    listFiles,
    copyFiles,
    moveFiles,

    // New tools
    deleteItem,
    createItem,
    readFile,
    writeFile,
    executeCommand,
    findAndReplace,
    generateProjectMap,
    makeHttpRequest,
    grep,
    glob,
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
