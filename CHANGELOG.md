# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-01

### Initial Release 🎉

This is the initial release of OAS-Sandbox, a stateful, spec-first OpenAPI mock server with comprehensive features for API development and testing.

### Added

#### Core Features
- **OpenAPI 3.0/3.1 Support**: Full support for OpenAPI specification loading and parsing
- **Stateful Mocking**: Persistent state management with multiple backend options
- **Scenario Engine**: Declarative YAML/TOML scenarios for complex API workflows
- **Request/Response Validation**: Comprehensive validation against OpenAPI schemas
- **Data Generation**: Schema-based deterministic data generation with Faker.js integration
- **Templating Engine**: Secure template processing with expression evaluation

#### State Management
- **Memory Store**: High-performance in-memory storage with TTL support
- **File Store**: Persistent file-based storage with automatic compaction
- **Redis Store**: Scalable Redis backend with pipelining and Lua script support
- **Session Scoping**: Automatic session isolation using headers, cookies, or tokens

#### Developer Experience
- **CLI Interface**: Comprehensive command-line tool with serve, inspect, and generate commands
- **Express Adapter**: Drop-in middleware for Express.js applications
- **TypeScript Support**: Full TypeScript definitions and strict type checking
- **Configuration Files**: Support for .sandboxrc.yaml/json configuration
- **Hot Reloading**: Development-friendly file watching and reloading

#### Advanced Features
- **Chaos Engineering**: Configurable latency, error rates, and failure simulation
- **Observability**: Structured logging with Pino, metrics, and admin endpoints
- **Content Negotiation**: Proper HTTP content type handling and Accept header processing
- **CORS Support**: Configurable CORS with allowlist functionality

#### Known Limitations
- **Proxy Mode**: Proxy and recording functionality planned for v1.1.0 (CLI options exist but not functional)

#### Scenario Capabilities
- **Multiple Actions**: respond, state management, delays, conditionals, proxying
- **Template Support**: Rich templating with Faker.js, utilities, and safe evaluation
- **Priority System**: Rule priority for complex matching scenarios
- **Conditional Logic**: if/else logic with template evaluation
- **State Operations**: get, set, patch, increment, delete with TTL support

#### CLI Commands
- `serve` - Start mock server with comprehensive options
- `inspect` - Analyze OpenAPI documents and show detailed information  
- `gen` - Generate sample data from OpenAPI schemas

#### Framework Integrations
- **Express.js**: Middleware with CORS, error handling, and custom configuration
- **HTTP Server**: Native Node.js HTTP server integration
- **Edge Runtime**: Compatible with Edge runtime environments

#### Security
- **Sandboxed Templates**: Safe template execution with no access to system resources
- **Request Validation**: Automatic validation prevents malformed requests
- **CORS Controls**: Granular CORS configuration for security
- **Input Sanitization**: Automatic sanitization of user inputs

#### Performance
- **Precompiled Validators**: AJV schema compilation for fast validation
- **Path Matching**: Optimized regex-based route matching
- **TTL Management**: Efficient TTL wheel algorithm for memory management
- **Minimal Dependencies**: Lightweight with carefully chosen dependencies

### Documentation
- Comprehensive README with examples and getting started guide
- Detailed API documentation for programmatic usage
- CLI examples and usage patterns
- Contributing guidelines and development setup
- Complete OpenAPI example with Pet Store API
- Scenario examples demonstrating all features

### Technical Details
- **Node.js**: Requires Node.js >= 18.0.0
- **TypeScript**: Built with TypeScript 5.2+ with strict settings
- **Testing**: Vitest test framework with coverage reporting
- **Build**: ESM and CommonJS compatible builds
- **Linting**: ESLint with TypeScript support

### Package Information
- **License**: MIT
- **Repository**: Available on GitHub
- **npm Package**: Ready for npm registry publication
- **Dependencies**: Carefully curated with security in mind

---

This initial release provides a solid foundation for API mocking and testing with comprehensive features that rival commercial solutions while remaining open source and extensible.