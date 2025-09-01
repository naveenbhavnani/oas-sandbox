# Contributing to OAS-Sandbox

Thank you for your interest in contributing to OAS-Sandbox! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/oas-sandbox.git
   cd oas-sandbox
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
oas-sandbox/
├── src/
│   ├── core/           # Core engine components
│   │   ├── loader.ts       # OpenAPI document loader
│   │   ├── router.ts       # Request routing and matching
│   │   ├── scenario.ts     # Scenario execution engine
│   │   ├── template.ts     # Template processing
│   │   ├── validator.ts    # Request/response validation
│   │   └── data-generator.ts # Schema-based data generation
│   ├── stores/         # State store implementations
│   │   ├── memory.ts       # In-memory store with TTL
│   │   ├── file.ts         # File-based persistent store
│   │   ├── redis.ts        # Redis store
│   │   └── index.ts        # Store factory
│   ├── adapters/       # Framework adapters
│   │   ├── express.ts      # Express.js middleware
│   │   ├── fastify.ts      # Fastify plugin
│   │   └── next.ts         # Next.js integration
│   ├── cli/            # Command line interface
│   │   ├── index.ts        # Main CLI entry
│   │   ├── config.ts       # Configuration handling
│   │   └── server.ts       # Server adapter
│   ├── types.ts        # TypeScript type definitions
│   ├── sandbox.ts      # Main Sandbox class
│   └── index.ts        # Library exports
├── test/               # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── fixtures/          # Test fixtures
├── examples/           # Usage examples
├── docs/              # Documentation
└── scripts/           # Build and utility scripts
```

## 🛠 Development Workflow

### Code Style

We use ESLint and TypeScript strict mode for code quality:

```bash
# Check linting
npm run lint

# Fix auto-fixable issues
npm run lint --fix

# Type checking
npm run typecheck
```

### Testing

We use Vitest for testing with coverage reporting:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Build in watch mode
npm run build:watch
```

## 📝 Contribution Guidelines

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed
   - Follow existing code patterns

3. **Test Your Changes**
   ```bash
   npm run build
   npm test
   npm run lint
   npm run typecheck
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Messages

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add Redis state store implementation
fix: handle null values in template evaluation
docs: update README with new CLI options
test: add integration tests for scenario engine
```

### Code Requirements

1. **TypeScript**
   - Use strict TypeScript settings
   - Provide proper type annotations
   - Avoid `any` types when possible

2. **Testing**
   - Write unit tests for new functions/classes
   - Add integration tests for new features
   - Maintain or improve test coverage
   - Include edge cases and error scenarios

3. **Documentation**
   - Update README.md for user-facing changes
   - Add JSDoc comments for public APIs
   - Include examples for new features
   - Update CHANGELOG.md

4. **Error Handling**
   - Handle errors gracefully
   - Provide meaningful error messages
   - Log errors appropriately
   - Don't expose internal details to users

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - Node.js version
   - npm version
   - Operating system
   - OAS-Sandbox version

2. **Reproduction Steps**
   - Minimal code example
   - OpenAPI document (if relevant)
   - Configuration used
   - Expected vs actual behavior

3. **Additional Context**
   - Error messages/stack traces
   - Screenshots (if applicable)
   - Related issues or discussions

### Feature Requests

For feature requests, please provide:

1. **Use Case Description**
   - What problem does this solve?
   - How would you use this feature?

2. **Proposed Solution**
   - High-level implementation approach
   - API design (if applicable)
   - Examples of usage

3. **Alternatives Considered**
   - Other approaches you've considered
   - Why this approach is preferred

## 🧪 Testing Guidelines

### Unit Tests

- Test individual functions/methods in isolation
- Mock external dependencies
- Cover positive, negative, and edge cases
- Keep tests focused and readable

Example:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { OpenAPILoader } from '../src/core/loader';

describe('OpenAPILoader', () => {
  it('should load valid OpenAPI document', async () => {
    const loader = new OpenAPILoader();
    const doc = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {}
    };
    
    await loader.load(doc);
    expect(loader.getDocument()).toEqual(doc);
  });
});
```

### Integration Tests

- Test complete workflows
- Use realistic test data
- Test error conditions
- Verify state changes

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { createSandbox } from '../src/sandbox';

describe('Sandbox Integration', () => {
  it('should handle complete request/response cycle', async () => {
    const sandbox = await createSandbox({
      oas: './test/fixtures/petstore.yaml',
      scenarios: './test/fixtures/scenarios.yaml'
    });

    // Test the complete flow
    const response = await sandbox.handleRequest(mockRequest);
    expect(response.status).toBe(200);
    
    await sandbox.close();
  });
});
```

## 🔧 Development Tools

### Debugging

Use the debug builds for development:

```bash
# Run with debug logging
DEBUG=oas-sandbox:* npm run dev

# Debug specific modules
DEBUG=oas-sandbox:loader,oas-sandbox:router npm run dev
```

### Performance Testing

```bash
# Run performance benchmarks
npm run benchmark

# Profile memory usage
npm run profile
```

### Code Coverage

```bash
# Generate detailed coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

## 📋 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build and verify
5. Create git tag
6. Publish to npm
7. Create GitHub release

## 🤝 Code of Conduct

### Our Pledge

We are committed to making participation in our project a harassment-free experience for everyone, regardless of:

- Age, body size, disability, ethnicity
- Gender identity and expression
- Experience level, education
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

**Positive behaviors:**
- Being respectful and inclusive
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behaviors:**
- Harassment or discriminatory language
- Personal attacks or trolling
- Public or private harassment
- Inappropriate sexual attention

### Enforcement

Project maintainers are responsible for enforcing these standards. They may:
- Remove, edit, or reject comments, commits, code, issues, and other contributions
- Ban temporarily or permanently any contributor for inappropriate behaviors

## 💬 Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Discord**: Real-time community chat (link in README)
- **Email**: security@oas-sandbox.org (for security issues)

## 🎯 Contribution Areas

We welcome contributions in these areas:

### High Priority
- [ ] Performance optimizations
- [ ] Additional state store backends
- [ ] Enhanced validation features
- [ ] Documentation improvements
- [ ] Test coverage improvements

### Medium Priority
- [ ] Additional framework adapters
- [ ] Recording/replay enhancements
- [ ] Chaos engineering features
- [ ] Monitoring integrations

### Low Priority
- [ ] UI for scenario management
- [ ] Additional data generators
- [ ] Plugin system
- [ ] GraphQL support

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- GitHub contributors page
- Release notes (for significant contributions)
- Twitter announcements (with permission)

Thank you for helping make OAS-Sandbox better! 🙏