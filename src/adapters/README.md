# Express.js Adapter

The Express.js adapter allows you to easily integrate OAS Sandbox into existing Express applications. It provides middleware that can handle OpenAPI-defined routes, scenarios, state management, and more.

## Features

- **Express Middleware Integration**: Drop-in middleware for Express applications
- **CORS Support**: Optional CORS configuration with allowlist support
- **Request/Response Mapping**: Automatic conversion between Express and Sandbox request/response formats
- **Error Handling**: Customizable error handling with logging integration
- **Base Path Support**: Mount the sandbox at specific paths
- **Programmatic API**: Multiple ways to integrate the adapter

## Basic Usage

```typescript
import express from 'express';
import { createExpressAdapter } from 'oas-sandbox';

const app = express();
app.use(express.json());

// Create and use the adapter
const adapter = await createExpressAdapter({
  oas: './api-spec.yaml',
  scenarios: './scenarios.yaml'
});

app.use(adapter.middleware());
app.listen(3000);
```

## Advanced Configuration

```typescript
import express from 'express';
import { createExpressAdapter } from 'oas-sandbox';

const app = express();
app.use(express.json());

const adapter = await createExpressAdapter({
  // OpenAPI specification
  oas: './api-spec.yaml',
  scenarios: './scenarios.yaml',
  
  // State management
  store: {
    type: 'redis',
    options: { host: 'localhost', port: 6379 }
  },
  
  // CORS configuration (disabled by default)
  cors: {
    enabled: true,
    allowlist: ['http://localhost:3000', 'https://mydomain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: ['Content-Type', 'Authorization', 'X-Sandbox-Session']
  },
  
  // Base path for sandbox routes
  basePath: '/api/v1',
  
  // Validation settings
  validate: {
    requests: true,
    responses: 'strict'
  },
  
  // Custom error handler
  errorHandler: (error, req, res, next) => {
    console.error('Sandbox error:', error);
    res.status(500).json({ error: 'Internal server error' });
  },
  
  // Enable request logging
  enableLogging: true
});

// Mount at specific path
app.use('/api/v1', adapter.middleware());
app.listen(3000);
```

## API Reference

### ExpressAdapter Class

#### Constructor Options (ExpressAdapterOptions)

Extends `SandboxOptions` with additional Express-specific options:

- `cors?: object` - CORS configuration
  - `enabled: boolean` - Enable CORS (default: false)
  - `allowlist?: string[]` - Array of allowed origins
  - `credentials?: boolean` - Allow credentials (default: false)
  - `methods?: string[]` - Allowed HTTP methods
  - `headers?: string[]` - Allowed headers
- `basePath?: string` - Base path for sandbox routes (default: '/')
- `errorHandler?: function` - Custom error handler function
- `enableLogging?: boolean` - Enable request logging (default: true)

#### Methods

- `initialize(): Promise<void>` - Initialize the sandbox
- `middleware(): RequestHandler` - Get the main middleware function
- `middlewares(): RequestHandler[]` - Get all middlewares (CORS + main)
- `close(): Promise<void>` - Clean up resources

### Factory Functions

#### `createExpressAdapter(options: ExpressAdapterOptions): Promise<ExpressAdapter>`

Creates and initializes an Express adapter instance.

#### `createExpressMiddleware(options: ExpressAdapterOptions): Promise<RequestHandler>`

Creates a single middleware function directly.

#### `createExpressMiddlewares(options: ExpressAdapterOptions): Promise<RequestHandler[]>`

Creates an array of middleware functions (includes CORS if enabled).

## Integration Patterns

### 1. Single Middleware

```typescript
const middleware = await createExpressMiddleware({
  oas: './api-spec.yaml'
});
app.use('/api', middleware);
```

### 2. Multiple Middlewares with CORS

```typescript
const middlewares = await createExpressMiddlewares({
  oas: './api-spec.yaml',
  cors: { enabled: true }
});
app.use('/api', ...middlewares);
```

### 3. Multiple API Versions

```typescript
const v1Adapter = await createExpressAdapter({
  oas: './api-v1.yaml',
  basePath: '/api/v1'
});

const v2Adapter = await createExpressAdapter({
  oas: './api-v2.yaml',
  basePath: '/api/v2'
});

app.use('/api/v1', v1Adapter.middleware());
app.use('/api/v2', v2Adapter.middleware());
```

### 4. With Other Express Middleware

```typescript
// CORS applied only to sandbox routes
app.use('/api', ...adapter.middlewares());

// Other routes not affected
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

## Request/Response Mapping

The adapter automatically converts between Express and Sandbox formats:

### Request Conversion

- `req.method` → `sandboxReq.method`
- `req.path` → `sandboxReq.path`
- `req.query` → `sandboxReq.query`
- `req.headers` → `sandboxReq.headers`
- `req.body` → `sandboxReq.body`
- `req.params` → `sandboxReq.pathParams.params`
- Cookies parsed from headers → `sandboxReq.cookies`

### Response Handling

The adapter lets the Sandbox handle the response directly through Express's response object, ensuring proper status codes, headers, and body formatting.

## Error Handling

The adapter provides multiple levels of error handling:

1. **Custom Error Handler**: Define your own error handling logic
2. **Default Error Handler**: Returns RFC 7807 problem details
3. **Logging Integration**: Optional error logging

```typescript
const adapter = await createExpressAdapter({
  oas: './api-spec.yaml',
  errorHandler: (error, req, res, next) => {
    // Custom error handling
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
```

## CORS Configuration

CORS is disabled by default. When enabled:

```typescript
cors: {
  enabled: true,
  allowlist: ['http://localhost:3000'], // Specific origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST'], // Allowed methods
  headers: ['Content-Type', 'Authorization'] // Allowed headers
}
```

If no `allowlist` is provided, CORS will be completely disabled for security.

## Session Management

The adapter supports OAS Sandbox's session management through:

- `X-Sandbox-Session` header
- `sandbox_session` cookie
- `Authorization` header (as fallback)

## Graceful Shutdown

```typescript
const adapter = await createExpressAdapter({ oas: './api-spec.yaml' });
const server = app.listen(3000);

process.on('SIGTERM', async () => {
  server.close();
  await adapter.close(); // Clean up sandbox resources
});
```

## TypeScript Support

The adapter is fully typed with TypeScript:

```typescript
import { 
  ExpressAdapter, 
  ExpressAdapterOptions,
  createExpressAdapter 
} from 'oas-sandbox';

const options: ExpressAdapterOptions = {
  oas: './api-spec.yaml',
  cors: { enabled: true }
};

const adapter: ExpressAdapter = await createExpressAdapter(options);
```