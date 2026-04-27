# File Operation MCP Server

An MCP (Model Context Protocol) server for comprehensive file system operations, built with TypeScript and pnpm.

## Features

This server provides a set of tools to interact with the file system safely and efficiently:

- **File Operations**: Create, read, write, copy, move, and remove files and directories.
- **Search & Discovery**: List files, generate tree views, use glob patterns, and grep search through file contents.
- **Advanced Tools**:
    - `find-and-replace`: Perform targeted text replacement with git-style diff previews.
    - `execute-command`: Run shell commands securely.
    - `http-request`: Perform HTTP requests directly from the server.
    - `count-files`: Quickly count files in directories.

## Installation

```bash
pnpm install
```

## Development

To build the project:
```bash
pnpm build
```

To run in development mode with auto-rebuild:
```bash
pnpm dev
```

## Usage

### Gemini CLI / Claude Desktop

Add the following configuration to your MCP settings:

```json
{
  "mcpServers": {
    "file-operation-mcp": {
      "command": "node",
      "args": ["/path/to/file-operation-mcp/dist/index.js"]
    }
  }
}
```

## License

MIT
