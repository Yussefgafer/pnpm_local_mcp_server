# AGENT.md - File Operation MCP Server

## Project Overview

**Project Name:** file-operation-mcp  
**Version:** 1.0.0  
**Type:** MCP (Model Context Protocol) Server  
**License:** MIT  
**Author:** lxKylin  
**Repository:** https://github.com/lxKylin/file-operation-mcp  
**Description:** A comprehensive file operation server based on Model Context Protocol (MCP), providing 14 powerful tools for file management, code search, HTTP requests, and command execution. Features high-quality utilities with cross-platform support, automatic binary detection, and safe error handling with tmp storage.

## Project Structure

```
/media/youusef/ProgramS/Div/MCP-server/file-operation-mcp/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── tools/                # MCP tools implementation
│   │   ├── index.ts          # Tools registry with initializeTools()
│   │   ├── count-files.ts    # Comprehensive directory statistics
│   │   ├── list-files.ts     # File listing with table output
│   │   ├── copy-files.ts     # Copy files/directories with utils
│   │   ├── move-files.ts     # Move files/directories with utils
│   │   ├── remove.ts         # Remove file/directory (auto-detect)
│   │   ├── create-item.ts    # Create file/directory
│   │   ├── read-file.ts      # Read with binary detection (8KB sample)
│   │   ├── write-file.ts     # Write with tmp storage on errors
│   │   ├── execute-command.ts # Execute shell commands
│   │   ├── find-and-replace.ts # Find and replace in files
│   │   ├── tree.ts           # Directory tree visualization
│   │   ├── http-request.ts   # HTTP requests (GET/POST/PUT/DELETE)
│   │   ├── grep.ts           # Regex search with binary skip
│   │   └── glob.ts           # Fast glob pattern matching
│   └── utils/                # Shared utilities
│       ├── index.ts          # Barrel exports
│       ├── formatters.ts     # File size, timestamps, base64
│       ├── platform.ts       # Cross-platform paths
│       ├── file-operations.ts # Metadata, binary detection, tmp
│       └── directory-utils.ts # Directory stats, size calculation
├── tmp/                      # Temporary files storage (auto-cleanup)
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
- **fast-glob** (v3.x): High-performance glob pattern matching

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
5. **remove**: Remove file or directory with automatic type detection. Uses 'remove' naming (safer than 'delete').
6. **create-item**: Create file or directory. Specify type="file" or type="directory". Supports optional initial content for files.
7. **read-file**: Read text file with maxChars limit (10000). Uses 8KB sample for binary detection. Returns statistics in Markdown format.
8. **write-file**: Write to new file only. On any error, saves content to tmp/ with timestamp+UUID filename and returns the path.

### Code & Search Tools
9. **find-and-replace**: Find and replace text in files using string or regex patterns
10. **tree**: Generate a directory tree view (like Unix `tree` command). Supports maxDepth and ignore patterns.
11. **grep**: Search for regex patterns in files. Auto-skips binary files (images, PDFs). Supports recursive search and file filtering.
12. **glob**: Find files using fast-glob. Supports multiple patterns, ignore lists, and brace expansion (e.g., "*.{js,ts}").

### System & Network Tools
13. **execute-command**: Execute shell commands with options for timeout, working directory, environment variables, and background execution.
14. **http-request**: Make HTTP requests (GET, POST, PUT, DELETE) with support for headers, data, authentication, proxy, and SSL verification.

## Special Features

### write-file Error Handling with Tmp Storage
When write-file encounters an error (file exists, invalid path, etc.), it:
1. Saves the content to `tmp/{timestamp}-{uuid}.txt` (or `.bin` for Buffer)
2. Binary content is base64-encoded for safe storage
3. Returns the tmp path in the error message
4. Auto-cleanup keeps only last 200 tmp files (FIFO)

### read-file Binary Detection
- Detects binary files using 8KB sample (null byte detection)
- Efficient partial read - doesn't read entire file
- Rejects binary files with clear error message
- Returns statistics in Markdown format with emoji indicators

### count-files Comprehensive Statistics
- Returns file count, directory count, total size
- Breakdown by file extension (top 15)
- Maximum depth calculation
- Uses single-pass traversal for performance

### glob with fast-glob
- High-performance pattern matching
- Supports brace expansion: `*.{js,ts}`
- Multiple patterns as array
- Respects ignore patterns (node_modules, .git)

### grep Binary File Skipping
- Automatically skips binary files (detected via getFileMetadata)
- Respects ignore patterns for directories
- Line length limit (150 chars) in output
- Clear indicator when results are truncated

### remove Auto-Detection
- Automatically detects if path is file or directory
- Uses 'remove' naming (clearer than 'delete')
- Supports recursive removal for directories
- Permission checks before operation

### Cross-Platform Path Support
- Works on Linux, macOS, and Windows
- getDefaultPath() returns appropriate Desktop path per platform
- Cached username and home directory
- Normalized path handling

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

## Utils Architecture

### Shared Utilities (src/utils/)
The project uses a comprehensive utility layer to ensure consistency:

- **formatters.ts**: formatFileSize (metric units), countLines, formatTimestamp, truncate
- **platform.ts**: Cross-platform paths, username caching, getDefaultPath()
- **file-operations.ts**: FileMetadata interface, binary detection (8KB sample), tmp operations
- **directory-utils.ts**: Single-pass directory stats, size calculation, file counting
- **index.ts**: Hybrid barrel exports (values + export type for isolatedModules)

### Tmp Management
- TMP_DIR: `tmp/` in project root
- Filename format: `{timestamp}-{uuid}.{ext}`
- Cleanup strategy: FIFO with max 200 files
- Auto-cleanup on startup and after each save

## Performance Characteristics

- Moderate latency for SSE transport (~10-50ms)
- Memory-efficient streaming for large files
- Binary detection: 8KB sample only (not entire file)
- Directory stats: Single-pass traversal
- Glob: Uses fast-glob (optimized native implementation)

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