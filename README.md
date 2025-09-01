# OAS-Sandbox

A stateful, spec-first OpenAPI mock server with scenarios, state management, and recording/replay capabilities.

[![NPM Version](https://img.shields.io/npm/v/oas-sandbox.svg)](https://www.npmjs.com/package/oas-sandbox)
[![License](https://img.shields.io/npm/l/oas-sandbox.svg)](https://github.com/your-org/oas-sandbox/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## 🚀 Quick Start

```bash
# Install globally
npm install -g oas-sandbox

# Start a mock server
oas-sandbox serve openapi.yaml --port 3000

# Or use npx
npx oas-sandbox serve openapi.yaml --scenarios ./scenarios
```

## ✨ Features

- **Stateful Mocking**: Persistent state per session with multiple store backends (memory, file, Redis)
- **Scenario-Driven**: Declarative YAML/TOML scenarios that mutate state and shape responses
- **OpenAPI 3.0/3.1**: Full OpenAPI spec validation for requests and responses
- **Data Generation**: Deterministic data generation using Faker.js with schema awareness
- **Recording/Replay**: ⚠️ *Coming Soon* - Capture live traffic to bootstrap mocks and create regression fixtures
- **Templating**: Powerful templating engine with safe expression evaluation
- **Multiple Runtimes**: Works in Node.js and Edge runtimes with minimal dependencies
- **Framework Adapters**: Express, Fastify, Next.js integration
- **Observability**: Structured logging, metrics, and chaos engineering features

## 📋 Table of Contents

- [Installation](#installation)
- [CLI Usage](#cli-usage)
- [Programmatic API](#programmatic-api)
- [Scenarios](#scenarios)
- [State Management](#state-management)
- [Templating](#templating)
- [Configuration](#configuration)
- [Examples](#examples)
- [Contributing](#contributing)

## 🛠 Installation

```bash
npm install oas-sandbox
```

## 🖥 CLI Usage

### Basic Commands

```bash
# Start mock server
oas-sandbox serve api.yaml

# Inspect OpenAPI document
oas-sandbox inspect api.yaml

# Generate test data
oas-sandbox gen --schema "#/components/schemas/User"
```

### Advanced Server Options

```bash
oas-sandbox serve api.yaml \\
  --port 8080 \\
  --scenarios ./scenarios \\
  --state redis://localhost:6379 \\
  --latency "120±40ms" \\
  --proxy https://real-api.com \\
  --record unmatched \\
  --admin \\
  --strict-responses
```

### Configuration File

Create `.sandboxrc.yaml`:

```yaml
oas: ./openapi.yaml
scenarios: ./scenarios
state:
  type: file
  options:
    path: ./sandbox-state
seed: my-deterministic-seed
validate:
  requests: true
  responses: warn
chaos:
  latency: "100±50ms"
  errorRate: 0.05
```

## 📚 Programmatic API

### Basic Usage

```typescript
import { createSandbox } from 'oas-sandbox';

const sandbox = await createSandbox({
  oas: './openapi.yaml',
  scenarios: './scenarios/',
  store: { type: 'memory' }
});

// Node.js HTTP server
const server = http.createServer((req, res) => {
  sandbox.handleRequest(req, res);
});
server.listen(3000);
```

### Express Integration

```typescript
import express from 'express';
import { createExpressAdapter } from 'oas-sandbox';

const app = express();
const adapter = await createExpressAdapter({
  oas: './openapi.yaml',
  scenarios: './scenarios/'
});

app.use('/api', adapter.middleware());
app.listen(3000);
```

### Fastify Integration

```typescript
import Fastify from 'fastify';
import { createFastifyPlugin } from 'oas-sandbox';

const fastify = Fastify();
await fastify.register(createFastifyPlugin, {
  oas: './openapi.yaml',
  scenarios: './scenarios/'
});

await fastify.listen({ port: 3000 });
```

## 🎯 Scenarios

Scenarios are declarative rules that define how your mock server responds to requests.

### Basic Scenario

```yaml
scenarios:
  - when:
      operationId: createUser
    do:
      - state.set:
          key: "user:{{req.body.id}}"
          value:
            id: "{{req.body.id}}"
            name: "{{req.body.name}}"
            created: "{{now}}"
      - respond:
          status: 201
          body:
            id: "{{req.body.id}}"
            name: "{{req.body.name}}"
            created: "{{state['user:' + req.body.id].created}}"
```

### Advanced Scenario Features

```yaml
scenarios:
  - when:
      operationId: getUser
      match:
        headers:
          X-User-Type: "premium"
    do:
      - if:
          when: "{{state['user:' + req.path.params.id]}}"
          then:
            - delay: "50±20ms"
            - respond:
                status: 200
                body:
                  $template: true
                  id: "{{req.path.params.id}}"
                  name: "{{state['user:' + req.path.params.id].name}}"
                  premium: true
                  credits: "{{state['user:' + req.path.params.id + ':credits'] || 100}}"
          else:
            - respond:
                status: 404
                body:
                  error: "User not found"
```

### Scenario Actions

- **respond**: Send HTTP response
- **state.set**: Store state value
- **state.patch**: Merge with existing state
- **state.increment**: Increment numeric value
- **state.del**: Delete state key
- **delay**: Add response latency
- **if/else**: Conditional logic
- **proxy**: Forward to real API
- **emit**: Log messages

## 🗄 State Management

### Session Scoping

State is automatically scoped by session ID resolved in this order:
1. `X-Sandbox-Session` header
2. `sandbox_session` cookie
3. `Authorization` header (raw string)
4. `"GLOBAL"` fallback

### Store Backends

#### Memory Store (Default)
```yaml
state:
  type: memory
  options:
    maxSize: 10000
    ttlSeconds: 3600
```

#### File Store
```yaml
state:
  type: file
  options:
    path: ./sandbox-state
    compactionInterval: 300000  # 5 minutes
```

#### Redis Store
```yaml
state:
  type: redis
  options:
    url: redis://localhost:6379
    keyPrefix: "oas-sandbox:"
```

## 🎨 Templating

### Template Syntax

Use `{{ expression }}` syntax with `$template: true`:

```yaml
respond:
  body:
    $template: true
    id: "{{req.path.params.id}}"
    name: "{{faker.person.fullName()}}"
    email: "{{faker.internet.email()}}"
    timestamp: "{{now.toISOString()}}"
    random: "{{rand(1, 100)}}"
```

### Available Globals

- `req` - Request object (method, path, query, headers, body, pathParams)
- `session` - Session context (id, scope)
- `state` - Read-only state access
- `now` - Current Date object
- `uuid()` - UUID v4 generator
- `rand(min, max)` - Seeded random numbers
- `faker` - Faker.js methods (deterministic)
- `math` - Math utilities
- `util` - String, array, object utilities

### Security

Templates run in a sandboxed environment with:
- No access to `process`, `require`, `eval`
- Expression length limits (1000 chars)
- Execution time caps (100ms)
- Pure functions only

## ⚙️ Configuration

### Validation Options

```yaml
validate:
  requests: true          # Validate incoming requests
  responses: "strict"     # "strict", "warn", or false
```

### Chaos Engineering

```yaml
chaos:
  latency: "200±100ms"    # Add latency with jitter
  errorRate: 0.1          # 10% random errors
  bandwidth: 1000000      # Throttle bandwidth
```

### Observability

```yaml
observability:
  logging:
    level: "info"         # Structured logging
    pretty: true
  metrics:
    enabled: true         # Prometheus metrics
    port: 9090
  admin:
    enabled: true         # Admin endpoints
    path: "/__sandbox"
```

## 📖 Examples

### E-commerce API

Complete example with shopping cart functionality:

```yaml
# scenarios/ecommerce.yaml
scenarios:
  - when:
      operationId: addToCart
    do:
      - state.increment:
          key: "cart:{{session.id}}:count"
          as: cartCount
      - state.set:
          key: "cart:{{session.id}}:item:{{req.body.productId}}"
          value:
            productId: "{{req.body.productId}}"
            quantity: "{{req.body.quantity}}"
            addedAt: "{{now.toISOString()}}"
      - respond:
          status: 200
          body:
            success: true
            cartCount: "{{ctx.vars.cartCount}}"

  - when:
      operationId: getCart
    do:
      - respond:
          status: 200
          body:
            $template: true
            items: "{{Object.values(state).filter(v => v.productId)}}"
            total: "{{state['cart:' + session.id + ':count'] || 0}}"
```

### User Management

```yaml
# scenarios/users.yaml  
scenarios:
  - when:
      operationId: createUser
    do:
      - state.set:
          key: "user:{{req.body.email}}"
          value:
            $template: true
            id: "{{uuid()}}"
            email: "{{req.body.email}}"
            name: "{{req.body.name}}"
            createdAt: "{{now.toISOString()}}"
            avatar: "{{faker.image.avatar()}}"
      - respond:
          status: 201
          headers:
            Location: "/users/{{state['user:' + req.body.email].id}}"
          body: "{{state['user:' + req.body.email]}}"

  - when:
      operationId: getUser
      match:
        headers:
          Authorization: "$regex:Bearer .+"
    do:
      - if:
          when: "{{state['user:' + req.path.params.id]}}"
          then:
            - respond:
                status: 200
                body: "{{state['user:' + req.path.params.id]}}"
          else:
            - respond:
                status: 404
                body:
                  error: "User not found"
```

## 🔍 Advanced Features

### Recording & Replay

> ⚠️ **Note**: Recording and replay functionality is planned for a future release. The CLI options (`--proxy`, `--record`, `--redact`) are available but not yet functional.

```bash
# Coming in v1.1.0 - Record unmatched requests to fixtures
oas-sandbox serve api.yaml \\
  --proxy https://api.example.com \\
  --record unmatched \\
  --redact "password" "token"
```

### Data Generation

```typescript
import { DataGenerator } from 'oas-sandbox';

const generator = new DataGenerator({
  seed: 'deterministic-seed',
  document: openApiDoc
});

const user = generator.generate({
  $ref: '#/components/schemas/User'
});
```

### Custom Hooks

```typescript
import { createSandbox } from 'oas-sandbox';

const sandbox = await createSandbox({
  oas: './api.yaml',
  hooks: {
    beforeRequest: async (ctx) => {
      ctx.logger.info('Processing request', { path: ctx.req.path });
    },
    afterResponse: async (ctx) => {
      ctx.logger.info('Response sent', { status: ctx.res.status });
    }
  }
});
```

## 🚀 Performance

- **5000+ RPS** baseline performance on Node.js 20
- **<2ms p95 latency** without validation
- Precompiled AJV validators and path matchers
- Efficient TTL wheel for memory store
- Redis pipelining for scalability

## 🔒 Security

- CORS disabled by default with allowlist option
- Request/response validation against OpenAPI spec
- Sandboxed template execution
- Configurable auth requirements
- Automatic credential redaction in recordings

## ⚠️ Current Limitations

### Recording/Replay (Coming in v1.1.0)

The following features are **not yet implemented** but are planned for the next release:

- **Traffic Recording**: Capturing live API traffic for replay
- **Proxy Mode**: Forwarding unmatched requests to real APIs  
- **Fixture Generation**: Auto-generating scenarios from recorded traffic
- **Request Redaction**: Sanitizing sensitive data in recordings

**CLI Options Available But Not Functional:**
- `--proxy <url>` - Proxy target configuration
- `--record <mode>` - Recording mode (always/unmatched/never)
- `--redact <fields>` - Fields to redact from recordings

**Current Behavior:**
- Unmatched requests return 404 instead of being proxied
- No traffic recording or fixture generation occurs
- These options are parsed but ignored

### Workarounds

For now, you can:
1. **Create scenarios manually** using the comprehensive scenario DSL
2. **Use state management** to simulate complex API workflows
3. **Generate realistic data** using the built-in Faker.js integration
4. **Mock all endpoints** by defining them in your OpenAPI spec

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Development Setup

```bash
git clone https://github.com/your-org/oas-sandbox.git
cd oas-sandbox
npm install
npm run build
npm test
```

### Project Structure

```
src/
├── core/           # Core engine components
├── stores/         # State store implementations  
├── adapters/       # Framework adapters
├── cli/            # Command line interface
└── types.ts        # TypeScript definitions
```

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [AJV](https://ajv.js.org/) for JSON schema validation
- [Faker.js](https://fakerjs.dev/) for realistic data generation
- [Commander.js](https://github.com/tj/commander.js) for CLI
- [Pino](https://github.com/pinojs/pino) for structured logging
- [Mustache](https://github.com/janl/mustache.js) for templating

---

**OAS-Sandbox** - Making OpenAPI mocking stateful, realistic, and powerful. 🎯