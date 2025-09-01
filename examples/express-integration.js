/**
 * Express.js Integration Example for OAS-Sandbox
 * 
 * This example shows how to integrate OAS-Sandbox with an Express.js application
 * to provide API mocking capabilities alongside real endpoints.
 */

const express = require('express');
const { createExpressAdapter } = require('oas-sandbox');
const path = require('path');

async function createApp() {
  const app = express();
  
  // Standard Express middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Create OAS-Sandbox adapter
  const sandboxAdapter = await createExpressAdapter({
    oas: path.join(__dirname, 'petstore-api.yaml'),
    scenarios: path.join(__dirname, 'petstore-scenarios.yaml'),
    store: {
      type: 'memory',
      options: { maxSize: 1000 }
    },
    seed: 'development-seed',
    validate: {
      requests: true,
      responses: 'warn'
    },
    cors: {
      enabled: true,
      allowlist: ['http://localhost:3000', 'http://localhost:8080']
    }
  });

  // Real endpoints (not mocked)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/version', (req, res) => {
    res.json({ 
      version: '1.0.0',
      sandbox: true,
      mode: 'development'
    });
  });

  // Mount the sandbox for API routes
  app.use('/api/v1', sandboxAdapter.middleware());

  // Error handling middleware
  app.use((error, req, res, next) => {
    console.error('Application error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  });

  return { app, sandboxAdapter };
}

async function main() {
  try {
    const { app, sandboxAdapter } = await createApp();
    const port = process.env.PORT || 3000;

    const server = app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📚 API endpoints available at http://localhost:${port}/api/v1`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET    /api/v1/pets        - List all pets');
      console.log('  POST   /api/v1/pets        - Create a pet');
      console.log('  GET    /api/v1/pets/{id}   - Get pet by ID');
      console.log('  PUT    /api/v1/pets/{id}   - Update pet');
      console.log('  DELETE /api/v1/pets/{id}   - Delete pet');
      console.log('  GET    /api/v1/owners      - List all owners');
      console.log('  POST   /api/v1/owners      - Create an owner');
      console.log('');
      console.log('Try some requests:');
      console.log('  curl -X POST http://localhost:3000/api/v1/pets -H "Content-Type: application/json" -d \'{"name":"Fluffy","tag":"cat"}\'');
      console.log('  curl http://localhost:3000/api/v1/pets');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        try {
          await sandboxAdapter.close();
          console.log('✅ Server closed successfully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log('⚠️  Force shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Advanced example with multiple API versions
async function createMultiVersionApp() {
  const app = express();
  app.use(express.json());

  // V1 API (stable)
  const v1Adapter = await createExpressAdapter({
    oas: path.join(__dirname, 'petstore-api-v1.yaml'),
    scenarios: path.join(__dirname, 'petstore-scenarios-v1.yaml'),
    store: { type: 'memory' },
    seed: 'v1-seed'
  });

  // V2 API (beta)
  const v2Adapter = await createExpressAdapter({
    oas: path.join(__dirname, 'petstore-api-v2.yaml'),
    scenarios: path.join(__dirname, 'petstore-scenarios-v2.yaml'),
    store: { type: 'memory' },
    seed: 'v2-seed',
    chaos: {
      latency: '50±25ms',
      errorRate: 0.02  // 2% error rate for beta testing
    }
  });

  app.use('/api/v1', v1Adapter.middleware());
  app.use('/api/v2', v2Adapter.middleware());

  return { app, adapters: [v1Adapter, v2Adapter] };
}

// Production-ready example with Redis state store
async function createProductionApp() {
  const app = express();
  
  // Production middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(require('cors')());
  app.use(require('helmet')());

  const sandboxAdapter = await createExpressAdapter({
    oas: path.join(__dirname, 'petstore-api.yaml'),
    scenarios: path.join(__dirname, 'petstore-scenarios.yaml'),
    store: {
      type: 'redis',
      options: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'petstore-sandbox:'
      }
    },
    validate: {
      requests: true,
      responses: 'strict'  // Strict validation in production
    },
    observability: {
      logging: { level: 'info' },
      metrics: { enabled: true }
    }
  });

  app.use('/api', sandboxAdapter.middleware());

  return { app, sandboxAdapter };
}

// Custom middleware example
function createCustomMiddleware(sandboxAdapter) {
  return async (req, res, next) => {
    // Add request ID for tracing
    req.requestId = require('uuid').v4();
    
    // Log incoming requests
    console.log(`[${req.requestId}] ${req.method} ${req.path}`);
    
    // Add custom headers
    res.set('X-Request-ID', req.requestId);
    res.set('X-API-Version', '1.0.0');
    
    // Add timing
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${req.requestId}] ${res.statusCode} - ${duration}ms`);
    });

    next();
  };
}

if (require.main === module) {
  main();
}

module.exports = {
  createApp,
  createMultiVersionApp,
  createProductionApp,
  createCustomMiddleware
};