const express = require('express');
const { createExpressAdapter, createExpressMiddlewares } = require('../dist');

// Example 1: Basic Usage
async function basicExample() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());

  // Create adapter with OpenAPI specification
  const adapter = await createExpressAdapter({
    oas: './petstore.yaml',
    scenarios: './scenarios.yaml',
    store: { type: 'memory' },
    validate: {
      requests: true,
      responses: 'warn'
    }
  });

  // Use the adapter middleware
  app.use(adapter.middleware());

  // Start server
  app.listen(3000, () => {
    console.log('Sandbox server running on port 3000');
  });

  return { app, adapter };
}

// Example 2: Advanced Usage with CORS and Custom Error Handling
async function advancedExample() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());

  // Create adapter with advanced options
  const adapter = await createExpressAdapter({
    oas: './petstore.yaml',
    scenarios: './scenarios.yaml',
    store: { 
      type: 'redis',
      options: { host: 'localhost', port: 6379 }
    },
    cors: {
      enabled: true,
      allowlist: ['http://localhost:3000', 'https://mydomain.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      headers: ['Content-Type', 'Authorization', 'X-Sandbox-Session']
    },
    basePath: '/api/v1',
    validate: {
      requests: true,
      responses: 'strict'
    },
    errorHandler: (error, req, res, next) => {
      console.error('Custom error handler:', error);
      res.status(500).json({
        error: 'Something went wrong!',
        message: error.message
      });
    },
    enableLogging: true
  });

  // Use all middlewares (CORS + main)
  app.use('/api/v1', ...adapter.middlewares());

  // Other Express routes (won't be handled by sandbox)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Start server
  app.listen(3000, () => {
    console.log('Advanced sandbox server running on port 3000');
  });

  return { app, adapter };
}

// Example 3: Multiple Adapter Instances
async function multipleAdaptersExample() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());

  // Create adapter for v1 API
  const v1Adapter = await createExpressAdapter({
    oas: './petstore-v1.yaml',
    basePath: '/api/v1',
    store: { type: 'memory' }
  });

  // Create adapter for v2 API
  const v2Adapter = await createExpressAdapter({
    oas: './petstore-v2.yaml',
    basePath: '/api/v2',
    store: { type: 'memory' }
  });

  // Mount different versions
  app.use('/api/v1', v1Adapter.middleware());
  app.use('/api/v2', v2Adapter.middleware());

  // Start server
  app.listen(3000, () => {
    console.log('Multi-version sandbox server running on port 3000');
  });

  return { app, adapters: [v1Adapter, v2Adapter] };
}

// Example 4: Using with TypeScript
/*
import express from 'express';
import { createExpressAdapter, ExpressAdapterOptions } from 'oas-sandbox';

async function typescriptExample() {
  const app = express();
  app.use(express.json());

  const options: ExpressAdapterOptions = {
    oas: './petstore.yaml',
    scenarios: './scenarios.yaml',
    cors: {
      enabled: true,
      allowlist: ['http://localhost:3000']
    },
    validate: {
      requests: true,
      responses: 'warn'
    }
  };

  const adapter = await createExpressAdapter(options);
  app.use(adapter.middleware());

  app.listen(3000);
  return { app, adapter };
}
*/

// Example 5: Graceful Shutdown
async function gracefulShutdownExample() {
  const app = express();
  app.use(express.json());

  const adapter = await createExpressAdapter({
    oas: './petstore.yaml'
  });

  app.use(adapter.middleware());

  const server = app.listen(3000, () => {
    console.log('Server running on port 3000');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    // Close sandbox (will close store connections)
    await adapter.close();
    console.log('Sandbox closed');
    
    process.exit(0);
  });

  return { app, adapter, server };
}

// Example 6: Using Convenience Functions
async function convenienceFunctionsExample() {
  const app = express();
  app.use(express.json());

  // Method 1: Single middleware
  const middleware = await createExpressMiddleware({
    oas: './petstore.yaml'
  });
  app.use('/api', middleware);

  // Method 2: Multiple middlewares (with CORS)
  const middlewares = await createExpressMiddlewares({
    oas: './petstore.yaml',
    cors: { enabled: true }
  });
  app.use('/api/v2', ...middlewares);

  app.listen(3000);
}

module.exports = {
  basicExample,
  advancedExample,
  multipleAdaptersExample,
  gracefulShutdownExample,
  convenienceFunctionsExample
};

// Run basic example if this file is executed directly
if (require.main === module) {
  basicExample().catch(console.error);
}