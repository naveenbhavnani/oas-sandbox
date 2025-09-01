# Data Generator Module

The data generator module provides comprehensive schema-based data generation for OpenAPI 3.0/3.1 schemas. It can generate realistic mock data that conforms to your API specifications.

## Features

- **Schema-based Generation**: Generates data from OpenAPI schemas
- **Format Awareness**: Special handling for `uuid`, `email`, `uri`, `date-time`, etc.
- **Deterministic Generation**: Seeded random generation for consistent results
- **Faker.js Integration**: Realistic data using faker.js
- **X-Sandbox Extensions**: Custom hints for enhanced generation
- **Reference Resolution**: Support for OpenAPI `$ref` references
- **Validation**: Built-in AJV-based schema validation
- **Constraint Respect**: Honors min/max, length, pattern constraints

## Basic Usage

```typescript
import { DataGenerator, createDataGenerator } from './core/data-generator';

// Create a generator
const generator = new DataGenerator({
  seed: 'my-seed',        // For deterministic results
  useExamples: true,      // Prefer schema examples
  maxArrayItems: 5,       // Limit array size
  maxStringLength: 100    // Limit string length
});

// Generate from simple schemas
const email = generator.generate({ 
  type: 'string', 
  format: 'email' 
});

const user = generator.generate({
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer', minimum: 18, maximum: 100 }
  },
  required: ['name']
});

// Validate generated data
const validation = generator.validate(schema, generatedData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

## OpenAPI Integration

```typescript
import { OpenAPIDocument } from './types';

const document: OpenAPIDocument = {
  openapi: '3.0.0',
  info: { title: 'API', version: '1.0.0' },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', example: 'John Doe' }
        },
        required: ['id', 'email']
      }
    }
  }
};

const generator = new DataGenerator({ document });

// Generate using references
const user = generator.generate({ 
  $ref: '#/components/schemas/User' 
});
```

## X-Sandbox Extensions

### Faker Hints

Use faker.js methods for realistic data:

```typescript
{
  type: 'string',
  'x-sandbox': {
    faker: 'name.firstName'  // Uses faker.name.firstName()
  }
}
```

### Enum Weighting

Control probability distribution for enum values:

```typescript
{
  type: 'string',
  enum: ['red', 'green', 'blue'],
  'x-sandbox': {
    enumWeights: {
      'red': 5,    // 5x more likely
      'green': 2,  // 2x more likely  
      'blue': 1    // baseline probability
    }
  }
}
```

## Format Support

The generator recognizes these string formats:

- `uuid` - Generates valid UUIDs
- `email` - Generates valid email addresses
- `uri`/`url` - Generates valid URLs
- `hostname` - Generates domain names
- `ipv4`/`ipv6` - Generates IP addresses
- `date` - Generates ISO date strings
- `date-time` - Generates ISO datetime strings
- `time` - Generates time strings
- `password` - Generates secure passwords
- `byte` - Generates base64 strings
- `binary` - Generates hexadecimal strings

## Schema Composition

Supports OpenAPI schema composition:

```typescript
// allOf - Merges all schemas
{
  allOf: [
    { 
      type: 'object',
      properties: { name: { type: 'string' } }
    },
    { 
      type: 'object',
      properties: { age: { type: 'number' } }
    }
  ]
}

// anyOf/oneOf - Randomly selects one schema
{
  anyOf: [
    { type: 'string' },
    { type: 'number' }
  ]
}
```

## Constraints

The generator respects all OpenAPI constraints:

```typescript
{
  type: 'string',
  minLength: 5,
  maxLength: 20,
  pattern: '^[A-Za-z]+$'
}

{
  type: 'number',
  minimum: 0,
  maximum: 100,
  multipleOf: 0.5
}

{
  type: 'array',
  items: { type: 'string' },
  minItems: 1,
  maxItems: 10,
  uniqueItems: true
}

{
  type: 'object',
  properties: { /* ... */ },
  required: ['prop1', 'prop2'],
  minProperties: 1,
  maxProperties: 5
}
```

## Factory Functions

```typescript
import { createDataGenerator, createSchemaAPI } from './core/data-generator';

// Create generator with options
const generator = createDataGenerator({
  seed: 'test-seed',
  useExamples: false,
  document: myOpenAPIDoc
});

// Create schema API (implements SchemaAPI interface)
const schemaAPI = createSchemaAPI({
  seed: 'api-seed'
});
```

## Integration with Scenarios

The data generator integrates seamlessly with the scenario system:

```yaml
scenarios:
  - when:
      operationId: createUser
    do:
      - respond:
          status: 201
          body:
            $template: true
            $schema: '#/components/schemas/User'
```

When `$schema` is specified without a body, the generator automatically creates appropriate response data.

## Deterministic Generation

Use seeds for consistent, reproducible data generation:

```typescript
const gen1 = new DataGenerator({ seed: 'same-seed' });
const gen2 = new DataGenerator({ seed: 'same-seed' });

// These will generate identical results
const result1 = gen1.generate(schema);
const result2 = gen2.generate(schema);
console.log(result1 === result2); // true

// Change seed for different results
gen1.setSeed('different-seed');
const result3 = gen1.generate(schema);
console.log(result1 === result3); // false
```

## Error Handling

The generator handles errors gracefully:

- Invalid schemas return fallback values instead of throwing
- Circular references are detected and handled
- Missing references log warnings but don't crash
- Validation errors are reported but don't stop generation

## Performance Considerations

- Schema compilation is cached for validation
- Reference resolution is memoized
- Circular reference detection prevents infinite loops
- Generation depth is limited to prevent stack overflow
- Array and object size limits prevent memory issues

## Examples

See `examples/data-generator-usage.js` for comprehensive usage examples demonstrating all features.