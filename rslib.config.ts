import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: ['node 18'],
      dts: true,
      output: {
        externals: [
          'fs-extra',
          '@modelcontextprotocol/sdk',
          'express',
          'axios',
          'fast-glob',
          'zod',
        ],
      },
      tools: {
        rspack: {
          externalsType: 'node-commonjs',
        },
      },
    },
    {
      format: 'cjs',
      syntax: ['node 18'],
      output: {
        externals: [
          'fs-extra',
          '@modelcontextprotocol/sdk',
          'express',
          'axios',
          'fast-glob',
          'zod',
        ],
      },
    },
  ],
});
