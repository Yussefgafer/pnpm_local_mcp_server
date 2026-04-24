import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import countFiles from './count-files';
import listFiles from './list-files';
import copyFiles from './copy-files';
import moveFiles from './move-files';

export default function registryTools(server: McpServer) {
  [
    countFiles,
    listFiles,
    copyFiles,
    moveFiles
  ].forEach((registryFn) => {
    registryFn(server);
  });
}
