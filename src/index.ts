import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

import registerTools, { initializeTools } from './tools';

// Create MCP server
const server = new McpServer({
  name: 'file-operation-server',
  version: '1.0.0'
});

// Start
async function main() {
  try {
    // Initialize tools (tmp directory setup, cleanup)
    await initializeTools();
    // Register tools
    registerTools(server);

    // SSE server
    const app = express();
    app.use(express.json());

    // Store transport sessions
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    // CORS configuration
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // SSE connection endpoint
    app.get('/sse', async (req, res) => {
      console.log('New SSE connection');

      try {
        const transport = new SSEServerTransport('/messages', res);
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;

        // Clean up disconnected connections
        res.on('close', () => {
          console.log(`SSE connection closed: ${sessionId}`);
          delete transports[sessionId];
        });

        await server.connect(transport);
      } catch (error) {
        console.error('Error handling SSE connection:', error);
        if (!res.headersSent) {
          res.status(500).send('Internal server error');
        }
      }
    });

    // Messages endpoint
    app.post('/messages', async (req, res) => {
      try {
        const sessionId = req.query.sessionId as string;
        const transport = transports[sessionId];

        if (transport) {
          await transport.handlePostMessage(req, res, req.body);
        } else {
          res.status(400).send('No transport found for session ID');
        }
      } catch (error) {
        console.error('Error handling message:', error);
        if (!res.headersSent) {
          res.status(500).send('Internal server error');
        }
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        message: 'MCP file operation server running',
        timestamp: new Date().toISOString()
      });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ MCP file operation server started on port ${PORT}`);
      console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise rejection:', reason);
  process.exit(1);
});

// Start server
main().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
