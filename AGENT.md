# AGENT.md - File Operation MCP Server

## Project Overview

**Project Name:** file-operation-mcp  
**Version:** 1.0.0  
**Type:** MCP (Model Context Protocol) Server  
**License:** MIT  
**Author:** lxKylin  
**Repository:** https://github.com/lxKylin/file-operation-mcp  
**Description:** A comprehensive file operation server based on Model Context Protocol (MCP), providing 14 powerful tools for file management, code search, HTTP requests, and command execution.

## Project Structure

```
/media/youusef/ProgramS/Div/MCP-server/file-operation-mcp/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── tools/                # MCP tools implementation
│   │   ├── index.ts          # Tools registry
│   │   ├── count-files.ts    # File counting tool
│   │   ├── list-files.ts     # File listing tool
│   │   ├── copy-files.ts     # File copy tool
│   │   ├── move-files.ts     # File move tool
│   │   ├── delete.ts         # Delete file/directory (auto-detect)
│   │   ├── create-item.ts    # Create file/directory
│   │   ├── read-file.ts      # Read file with size protection
│   │   ├── write-file.ts     # Write file (saves to tmp on errors)
│   │   ├── execute-command.ts # Execute shell commands
│   │   ├── find-and-replace.ts # Find and replace in files
│   │   ├── map.ts            # Generate project tree map
│   │   ├── http-request.ts   # HTTP requests (GET/POST/PUT/DELETE)
│   │   ├── grep.ts           # Search with regex in files
│   │   └── glob.ts           # Find files by glob pattern
│   └── utils/                # Utility functions
│       └── timeout.ts        # Timeout utilities
├── tmp/                      # Temporary files storage
├── dist/                     # Built distribution files
├── package.json              # Project dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── rslib.config.ts          # Build tool configuration
├── pnpm-lock.yaml           # Package lock file
├── eslint.config.mjs        # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .prettierignore          # Prettier ignore rules
├── LICENSE                  # MIT license file
├── AGENT.md                 # Project documentation
└── .gitignore               # Git ignore rules
```

## Technologies and Libraries

### Core Dependencies
- **@modelcontextprotocol/sdk** (v1.15.1): Official MCP SDK for server implementation
- **express** (v5.1.0): HTTP server framework for SSE transport
- **zod** (v3.25.76): TypeScript-first schema validation
- **fs-extra** (v11.3.0): Enhanced file system operations
- **axios** (v1.11.0): HTTP client for API requests

### Development Dependencies
- **@rslib/core** (v0.10.5): Build tool for libraries
- **@types/node** (v22.16.0): Node.js type definitions
- **@types/express** (v5.0.3): Express type definitions
- **@types/fs-extra** (v11.0.4): fs-extra type definitions
- **typescript** (v5.8.3): TypeScript compiler
- **eslint** (v9.29.0): Code linting
- **prettier** (v3.5.3): Code formatting
- **typescript-eslint** (v8.34.1): TypeScript ESLint rules

## MCP Tools (Available Functions)

The server provides 14 MCP tools for file operations:

### Basic File Operations
1. **count-files**: Statistics on file count in specified folders
2. **list-files**: Detailed file list with names, types, and sizes
3. **copy-files**: Copy files/folders while preserving timestamps
4. **move-files**: Move files/folders (cut operation)
5. **delete**: Delete file or directory with automatic type detection. Returns helpful error if type mismatch.
6. **create-item**: Create file or directory. Specify type="file" or type="directory". Supports optional initial content for files.
7. **read-file**: Read text file content with maxChars limit (default 10000). Returns statistics if truncated. Rejects binary files.
8. **write-file**: Write to new file only (fails if exists). On any error, saves content to tmp/{uuid}.txt and returns the path.

### Code & Search Tools
9. **find-and-replace**: Find and replace text in files using string or regex patterns
10. **map**: Generate a tree view of project directory structure
11. **grep**: Search for regex patterns in files. Supports recursive search, case sensitivity, and file pattern filtering.
12. **glob**: Find files matching glob patterns (e.g., "src/**/*.ts"). Supports ignore patterns and absolute/relative paths.

### System & Network Tools
13. **execute-command**: Execute shell commands with options for timeout, working directory, environment variables, and background execution.
14. **http-request**: Make HTTP requests (GET, POST, PUT, DELETE) with support for headers, data, authentication, proxy, and SSL verification.

## Special Features

### write-file Error Handling
When write-file encounters an error (file exists, invalid path, etc.), it:
1. Saves the content to `tmp/{uuid}.txt`
2. Returns the tmp path in the error message
3. Logs the error to console for debugging

### read-file Size Protection
- Default maxChars: 10000 characters
- Returns truncated content with statistics if limit exceeded
- Automatically detects and rejects binary files
- Provides line count and file size information

### delete Auto-Detection
- Automatically detects if path is file or directory
- Returns clear error message if user tries to delete file as directory or vice versa
- Supports recursive deletion for directories

## Build Configuration

### TypeScript Configuration (tsconfig.json)
- Target: ES2021
- Module: ESNext
- Strict mode enabled
- Path mapping: `@/*` → `src/*`
- Isolated modules for bundler compatibility

### Build Tool (rslib.config.ts)
- Outputs both ESM and CommonJS formats
- Targets Node.js 18+
- Generates TypeScript declaration files

## Transport Protocols

### SSE (Server-Sent Events) - Only Transport
- HTTP-based communication
- Supports multiple clients
- Remote access capability
- Health check endpoint: `/health`
- SSE endpoint: `/sse`
- Messages endpoint: `/messages`

## Environment and Requirements

- **Node.js:** >= 18.0.0
- **Package Manager:** pnpm (recommended) or npm
- **Platform:** Linux (current: linux)
- **Architecture:** Supports cross-platform operations
- **Working Directory:** /media/youusef/ProgramS/Div/MCP-server/file-operation-mcp
- **Git Repository:** Yes

## Scripts and Commands

### Build Scripts
- `npm run build` / `pnpm build`: Build the project using rslib
- `npm run dev` / `pnpm dev`: Build in watch mode for development
- `npm run start` / `pnpm start`: Start the production server

### Development Scripts
- `npm run format` / `pnpm format`: Format code with Prettier
- `npm run lint` / `pnpm lint`: Lint code with ESLint

## Configuration and Setup

### Package Configuration
- Type: ESM module
- Main entry: `./dist/index.js`
- Types: `./dist/index.d.ts`
- Exports both ESM and CommonJS versions

### Server Configuration
- Default port: 3000 (configurable via PORT environment variable)
- CORS enabled for cross-origin requests
- Session management for SSE connections
- Error handling and graceful shutdown

## Security and Permissions

- File system access requires appropriate permissions
- Path validation and security checks
- No file overwriting by default (must be explicitly enabled)
- Safe operations with confirmation prompts
- Protection against common file operation vulnerabilities

## Performance Characteristics

- Moderate latency for SSE transport (~10-50ms)
- Memory-efficient streaming for large files

## Development Notes

- Built with TypeScript for type safety
- Uses modern ESM imports
- Follows MCP protocol specifications
- Comprehensive error handling
- Debug output uses `console.error()` to avoid protocol interference
- Supports both development and production modes

## Integration

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "file-operation-mcp": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### Cursor IDE Configuration
```json
{
  "mcpServers": {
    "file-operation-mcp": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Health Monitoring

- Health check endpoint: `GET /health`
- Returns server status and timestamp
- Useful for monitoring and load balancing

This server provides comprehensive file operation capabilities through the MCP protocol, enabling AI assistants to perform various file management tasks securely and efficiently.