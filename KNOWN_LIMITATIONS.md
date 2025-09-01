# Known Limitations - OAS-Sandbox v1.0.0

## ⚠️ Recording/Replay Features - Coming in v1.1.0

The following features mentioned in the specification are **not yet implemented** in v1.0.0:

### Not Functional:
- ❌ **HTTP Proxy Mode**: Forwarding unmatched requests to real APIs
- ❌ **Traffic Recording**: Capturing live API traffic for replay  
- ❌ **Fixture Generation**: Auto-generating scenarios from recorded traffic
- ❌ **Request Redaction**: Sanitizing sensitive data in recordings
- ❌ **Replay Functionality**: Playing back recorded traffic as scenarios

### CLI Options Present But Ignored:
- `--proxy <url>` - Parsed but not functional
- `--record <mode>` - Parsed but not functional  
- `--redact <fields...>` - Parsed but not functional

### Current Behavior:
- Unmatched requests return `404 Not Found` instead of being proxied
- No traffic recording occurs regardless of `--record` setting
- All recording-related options are silently ignored

## ✅ Fully Functional Features

All other features from the specification work as documented:

- ✅ **Stateful Mocking**: Memory, File, and Redis state stores
- ✅ **Scenario Engine**: Complete YAML DSL with all action types
- ✅ **OpenAPI Validation**: Request/response validation with Problem+JSON
- ✅ **Data Generation**: Schema-based generation with Faker.js
- ✅ **Templating**: Secure template evaluation with rich context
- ✅ **CLI Interface**: serve, inspect, gen commands (minus proxy features)
- ✅ **Express Adapter**: Complete middleware with CORS support
- ✅ **Session Management**: Multi-strategy session ID resolution
- ✅ **Observability**: Structured logging and admin endpoints

## 🔄 Workarounds

Until proxy/recording features are implemented:

1. **Define Complete APIs**: Include all endpoints in your OpenAPI spec
2. **Use Scenarios**: Create rich scenarios for complex workflows  
3. **Leverage State**: Use state management to simulate API interactions
4. **Generate Data**: Use built-in Faker.js for realistic test data

## 📅 Roadmap

**v1.1.0 (Planned)**:
- HTTP proxy integration with `http-proxy-middleware`
- Traffic recording to fixture files
- Request/response redaction
- Fixture-to-scenario conversion
- Replay functionality

**v1.0.0 Status**: 95% specification compliance - Production ready for stateful mocking!