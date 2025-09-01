# OAS-Sandbox CLI Examples

This document provides comprehensive examples of using the OAS-Sandbox CLI for various scenarios.

## 📚 Table of Contents

- [Basic Usage](#basic-usage)
- [Serve Command Examples](#serve-command-examples)
- [Inspect Command Examples](#inspect-command-examples)
- [Generate Command Examples](#generate-command-examples)
- [Configuration Examples](#configuration-examples)
- [Advanced Scenarios](#advanced-scenarios)

## 🚀 Basic Usage

### Simple Mock Server

```bash
# Start a basic mock server
oas-sandbox serve openapi.yaml

# Specify port and host
oas-sandbox serve openapi.yaml --port 8080 --host 0.0.0.0

# With custom scenarios
oas-sandbox serve openapi.yaml --scenarios ./scenarios/
```

### Quick API Analysis

```bash
# Inspect an OpenAPI document
oas-sandbox inspect openapi.yaml

# Generate sample data
oas-sandbox gen --schema "#/components/schemas/User"
```

## 🖥 Serve Command Examples

### Development Environment

```bash
# Development server with file-based state
oas-sandbox serve petstore.yaml \
  --port 3000 \
  --scenarios ./dev-scenarios \
  --state file://./dev-state \
  --log debug \
  --admin
```

### Testing Environment

```bash
# Testing with Redis state store and chaos
oas-sandbox serve api.yaml \
  --scenarios ./test-scenarios \
  --state redis://localhost:6379 \
  --seed test-seed-123 \
  --latency "100±50ms" \
  --error-rate 0.05 \
  --strict-responses
```

### Production Staging

```bash
# Production-like staging environment
oas-sandbox serve openapi.yaml \
  --port 8080 \
  --host 0.0.0.0 \
  --scenarios ./prod-scenarios \
  --state redis://redis.staging:6379 \
  --proxy https://api.production.com \
  --record unmatched \
  --redact password token secret \
  --log info
```

### Proxy and Recording

```bash
# Forward unmatched requests to real API
oas-sandbox serve api.yaml \
  --proxy https://jsonplaceholder.typicode.com \
  --record always \
  --redact "Authorization" "X-API-Key"

# Record only unmatched requests
oas-sandbox serve api.yaml \
  --proxy https://real-api.com \
  --record unmatched

# No recording, just proxy
oas-sandbox serve api.yaml \
  --proxy https://real-api.com \
  --record never
```

### State Store Examples

```bash
# In-memory store (default)
oas-sandbox serve api.yaml

# File-based store
oas-sandbox serve api.yaml \
  --state file://./sandbox-data

# Redis store
oas-sandbox serve api.yaml \
  --state redis://localhost:6379

# Redis with auth
oas-sandbox serve api.yaml \
  --state redis://username:password@redis.example.com:6379/0
```

### Chaos Engineering

```bash
# Add latency and errors for resilience testing
oas-sandbox serve api.yaml \
  --latency "200±100ms" \
  --error-rate 0.1 \
  --scenarios ./chaos-scenarios

# High chaos for stress testing
oas-sandbox serve api.yaml \
  --latency "500±300ms" \
  --error-rate 0.2 \
  --bandwidth 100000  # 100KB/s bandwidth limit
```

### Validation Options

```bash
# Strict validation
oas-sandbox serve api.yaml \
  --strict-responses \
  # --no-validate-requests would disable request validation

# Development mode with warnings
oas-sandbox serve api.yaml \
  --log debug  # Validation warnings will be logged
```

## 🔍 Inspect Command Examples

### Basic Inspection

```bash
# Basic API analysis
oas-sandbox inspect petstore.yaml

# JSON output for programmatic use
oas-sandbox inspect petstore.yaml --format json

# Save to file
oas-sandbox inspect petstore.yaml --output api-analysis.json
```

### Detailed Analysis

```bash
# Table format (default)
oas-sandbox inspect petstore.yaml --format table

# YAML format
oas-sandbox inspect petstore.yaml --format yaml --output analysis.yaml
```

Expected output:
```
OpenAPI Document Analysis
========================

📊 Summary:
  • OpenAPI Version: 3.0.0
  • Title: Pet Store API
  • Version: 1.0.0
  • Servers: 2
  • Paths: 5
  • Operations: 8
  • Components: 7

🛣 Operations:
┌─────────────────┬────────┬──────────────┬─────────────────┐
│ Operation ID    │ Method │ Path         │ Status Codes    │
├─────────────────┼────────┼──────────────┼─────────────────┤
│ listPets        │ GET    │ /pets        │ 200, default    │
│ createPet       │ POST   │ /pets        │ 201, 400        │
│ showPetById     │ GET    │ /pets/{id}   │ 200, 404        │
│ updatePet       │ PUT    │ /pets/{id}   │ 200, 404        │
│ deletePet       │ DELETE │ /pets/{id}   │ 204, 404        │
└─────────────────┴────────┴──────────────┴─────────────────┘
```

## 🎲 Generate Command Examples

### Schema Generation

```bash
# Generate single object
oas-sandbox gen --schema "#/components/schemas/Pet"

# Generate multiple objects
oas-sandbox gen --schema "#/components/schemas/Pet" --count 5

# Use custom seed for reproducible data
oas-sandbox gen --schema "#/components/schemas/User" --seed my-test-seed

# Output to file
oas-sandbox gen --schema "#/components/schemas/Pet" \
  --count 10 \
  --format json \
  --output pets.json
```

### YAML Output

```bash
# Generate YAML format
oas-sandbox gen --schema "#/components/schemas/Pet" \
  --format yaml \
  --output pet-sample.yaml
```

### Specific Examples

```bash
# Generate user data
oas-sandbox gen --schema "#/components/schemas/User" --count 3

# Generate complex nested objects
oas-sandbox gen --schema "#/components/schemas/Order" \
  --count 5 \
  --seed order-test-123

# Generate with specific OpenAPI document
oas-sandbox gen api.yaml --schema "#/components/schemas/Product"
```

## ⚙️ Configuration Examples

### Configuration File Usage

Create `.sandboxrc.yaml`:
```yaml
oas: ./openapi.yaml
scenarios: ./scenarios/
port: 3000
state:
  type: file
  options:
    path: ./sandbox-state
seed: development-seed
validate:
  requests: true
  responses: warn
chaos:
  latency: "50±25ms"
  errorRate: 0.02
observability:
  logging:
    level: info
    pretty: true
admin: true
```

Use configuration file:
```bash
# Uses .sandboxrc.yaml automatically
oas-sandbox serve

# Specify config file
oas-sandbox serve --config ./custom-config.yaml

# Override config values
oas-sandbox serve --config ./config.yaml --port 8080
```

### JSON Configuration

Create `sandbox.config.json`:
```json
{
  "oas": "./api.yaml",
  "scenarios": "./scenarios/",
  "state": {
    "type": "redis",
    "options": {
      "url": "redis://localhost:6379"
    }
  },
  "validate": {
    "requests": true,
    "responses": "strict"
  }
}
```

## 🎯 Advanced Scenarios

### E2E Testing Setup

```bash
# Setup for end-to-end testing
oas-sandbox serve test-api.yaml \
  --scenarios ./e2e-scenarios \
  --state memory \
  --seed e2e-test-$(date +%s) \
  --port 9999 \
  --no-validate-requests  # Allow test data that might be invalid
```

### Load Testing Preparation

```bash
# High-performance setup for load testing
oas-sandbox serve api.yaml \
  --scenarios ./load-test-scenarios \
  --state memory \
  --seed load-test \
  --latency "1±0.5ms" \
  --admin \
  --log error  # Reduce logging overhead
```

### Multi-Environment Setup

```bash
# Development
oas-sandbox serve api.yaml \
  --config ./configs/development.yaml \
  --port 3000

# Staging  
oas-sandbox serve api.yaml \
  --config ./configs/staging.yaml \
  --port 4000

# Production simulation
oas-sandbox serve api.yaml \
  --config ./configs/production.yaml \
  --port 5000
```

### Docker Integration

```bash
# Using environment variables in Docker
docker run -p 3000:3000 \
  -e OAS_SANDBOX_CONFIG='{"oas":"/api/openapi.yaml","port":3000}' \
  -v $(pwd):/api \
  oas-sandbox serve

# With external Redis
docker run -p 3000:3000 \
  --link redis:redis \
  -v $(pwd):/api \
  oas-sandbox serve /api/openapi.yaml \
  --state redis://redis:6379
```

### API Versioning

```bash
# V1 API on port 3001
oas-sandbox serve api-v1.yaml \
  --scenarios ./v1-scenarios \
  --port 3001 \
  --state redis://localhost:6379 \
  --seed v1

# V2 API on port 3002  
oas-sandbox serve api-v2.yaml \
  --scenarios ./v2-scenarios \
  --port 3002 \
  --state redis://localhost:6379 \
  --seed v2
```

### Microservices Simulation

```bash
# User service
oas-sandbox serve user-service.yaml \
  --port 3001 \
  --scenarios ./users \
  --state redis://shared-redis:6379

# Product service
oas-sandbox serve product-service.yaml \
  --port 3002 \
  --scenarios ./products \
  --state redis://shared-redis:6379

# Order service with cross-service calls
oas-sandbox serve order-service.yaml \
  --port 3003 \
  --scenarios ./orders \
  --state redis://shared-redis:6379 \
  --proxy http://user-service:3001,http://product-service:3002
```

### Performance Monitoring

```bash
# With Prometheus metrics enabled
oas-sandbox serve api.yaml \
  --admin \
  --log info \
  --scenarios ./monitoring-scenarios

# Access metrics at http://localhost:3000/__sandbox/metrics
curl http://localhost:3000/__sandbox/metrics
```

### Security Testing

```bash
# Test with authentication requirements
oas-sandbox serve api.yaml \
  --scenarios ./security-scenarios \
  # Scenarios can check for auth headers and return 401/403
```

### CI/CD Integration

```bash
# In GitHub Actions or other CI
oas-sandbox serve api.yaml \
  --scenarios ./ci-scenarios \
  --state memory \
  --port 3000 \
  --seed ci-build-${BUILD_NUMBER} \
  --log error \
  & 

# Wait for server to start
sleep 5

# Run tests
npm test

# Server automatically stops when process ends
```

## ⚠️ Known Limitations (v1.0.0)

### Recording/Replay Features Not Yet Available

The following CLI options are **parsed but not functional** in v1.0.0:

```bash
# These options don't work yet (coming in v1.1.0)
--proxy <url>          # Proxy target for unmatched requests
--record <mode>        # Recording mode (always/unmatched/never) 
--redact <fields...>   # Fields to redact from recordings
```

**Current Behavior:**
- Unmatched requests return 404 instead of being proxied
- No traffic recording occurs
- These options are silently ignored

**Workaround:**
Define all your API endpoints in your OpenAPI spec and create scenarios for the responses you need.

---

## 🛠 Troubleshooting

### Debug Mode

```bash
# Enable debug logging
oas-sandbox serve api.yaml --log debug

# Inspect configuration
oas-sandbox inspect api.yaml --format json | jq '.'

# Test specific scenarios
oas-sandbox serve api.yaml \
  --scenarios ./debug-scenarios \
  --log debug \
  --admin  # Check /__sandbox/state for state inspection
```

### Validation Issues

```bash
# Check OpenAPI document validity
oas-sandbox inspect api.yaml

# Disable validation temporarily
oas-sandbox serve api.yaml --no-validate-requests

# See validation errors in detail
oas-sandbox serve api.yaml --log debug --strict-responses
```

### State Management

```bash
# Clear state store
curl -X DELETE http://localhost:3000/__sandbox/state

# Inspect current state
curl http://localhost:3000/__sandbox/state | jq '.'

# Backup state
curl http://localhost:3000/__sandbox/state > backup.json

# Restore state
curl -X PUT http://localhost:3000/__sandbox/state \
  -H "Content-Type: application/json" \
  -d @backup.json
```

## 📈 Performance Tips

1. **Use Memory Store for Development**
   ```bash
   oas-sandbox serve api.yaml --state memory
   ```

2. **Reduce Logging in Production**
   ```bash
   oas-sandbox serve api.yaml --log error
   ```

3. **Disable Admin Endpoints in Production**
   ```bash
   oas-sandbox serve api.yaml  # --admin is off by default
   ```

4. **Use Deterministic Seeds for Testing**
   ```bash
   oas-sandbox serve api.yaml --seed test-123
   ```

This covers the most common CLI usage patterns. For more advanced use cases, check the programmatic API documentation.