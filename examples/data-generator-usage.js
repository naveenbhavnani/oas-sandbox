// Example usage of the data-generator module
// This file demonstrates how to use the DataGenerator class

const { DataGenerator, createSchemaAPI } = require('../dist/core/data-generator');

// Example OpenAPI document
const document = {
  openapi: '3.0.0',
  info: { title: 'Pet Store', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['name', 'status'],
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
            example: 10
          },
          name: {
            type: 'string',
            example: 'doggie'
          },
          category: {
            $ref: '#/components/schemas/Category'
          },
          photoUrls: {
            type: 'array',
            items: {
              type: 'string',
              format: 'url'
            }
          },
          tags: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Tag'
            }
          },
          status: {
            type: 'string',
            description: 'pet status in the store',
            enum: ['available', 'pending', 'sold'],
            'x-sandbox': {
              enumWeights: {
                'available': 5,
                'pending': 2,
                'sold': 3
              }
            }
          }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
            example: 1
          },
          name: {
            type: 'string',
            example: 'Dogs',
            'x-sandbox': {
              faker: 'animal.type'
            }
          }
        }
      },
      Tag: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            format: 'int64'
          },
          name: {
            type: 'string'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            format: 'int64'
          },
          username: {
            type: 'string'
          },
          firstName: {
            type: 'string',
            'x-sandbox': {
              faker: 'name.firstName'
            }
          },
          lastName: {
            type: 'string',
            'x-sandbox': {
              faker: 'name.lastName'
            }
          },
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string',
            format: 'password'
          },
          phone: {
            type: 'string',
            pattern: '^\\d{3}-\\d{3}-\\d{4}$'
          },
          userStatus: {
            type: 'integer',
            format: 'int32',
            description: 'User Status'
          }
        }
      }
    }
  }
};

console.log('=== Data Generator Examples ===\n');

// Create generator with seed for deterministic results
const generator = new DataGenerator({ 
  seed: 'example-seed',
  document: document,
  useExamples: true
});

// Example 1: Generate simple types
console.log('1. Simple Types:');
console.log('String:', generator.generate({ type: 'string' }));
console.log('Number:', generator.generate({ type: 'number', minimum: 1, maximum: 100 }));
console.log('Boolean:', generator.generate({ type: 'boolean' }));
console.log('UUID:', generator.generate({ type: 'string', format: 'uuid' }));
console.log('Email:', generator.generate({ type: 'string', format: 'email' }));
console.log();

// Example 2: Generate arrays
console.log('2. Arrays:');
const arraySchema = {
  type: 'array',
  items: { type: 'string', format: 'email' },
  minItems: 2,
  maxItems: 5
};
console.log('Email Array:', generator.generate(arraySchema));
console.log();

// Example 3: Generate objects with constraints
console.log('3. Objects with Constraints:');
const constrainedObject = {
  type: 'object',
  properties: {
    username: { 
      type: 'string', 
      minLength: 3, 
      maxLength: 20 
    },
    age: { 
      type: 'integer', 
      minimum: 18, 
      maximum: 100 
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 3
    }
  },
  required: ['username', 'age']
};
console.log('Constrained Object:', JSON.stringify(generator.generate(constrainedObject), null, 2));
console.log();

// Example 4: Use examples from schema
console.log('4. Schema Examples:');
const user = generator.generate({ $ref: '#/components/schemas/User' });
console.log('Generated User:', JSON.stringify(user, null, 2));
console.log();

// Example 5: Generate with x-sandbox extensions
console.log('5. X-Sandbox Extensions:');
const pet = generator.generate({ $ref: '#/components/schemas/Pet' });
console.log('Generated Pet:', JSON.stringify(pet, null, 2));
console.log();

// Example 6: Enum with weighting
console.log('6. Weighted Enums (generate multiple):');
const statusResults = [];
for (let i = 0; i < 10; i++) {
  const petStatus = generator.generate({ 
    $ref: '#/components/schemas/Pet' 
  }).status;
  statusResults.push(petStatus);
}
const statusCounts = statusResults.reduce((acc, status) => {
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});
console.log('Status Distribution:', statusCounts);
console.log();

// Example 7: Validation
console.log('7. Schema Validation:');
const generatedUser = generator.generate({ $ref: '#/components/schemas/User' });
const validation = generator.validate({ $ref: '#/components/schemas/User' }, generatedUser);
console.log('Generated User Valid:', validation.valid);
console.log();

// Example 8: Different seeds produce different results
console.log('8. Seed Determinism:');
const gen1 = new DataGenerator({ seed: 'seed-1', document });
const gen2 = new DataGenerator({ seed: 'seed-2', document });
const gen3 = new DataGenerator({ seed: 'seed-1', document }); // Same as gen1

console.log('Gen1 (seed-1):', gen1.generate({ type: 'string' }));
console.log('Gen2 (seed-2):', gen2.generate({ type: 'string' }));
console.log('Gen3 (seed-1):', gen3.generate({ type: 'string' }));
console.log('Gen1 === Gen3:', gen1.generate({ type: 'number' }) === gen3.generate({ type: 'number' }));
console.log();

// Example 9: Factory functions
console.log('9. Factory Functions:');
const schemaAPI = createSchemaAPI({ seed: 'api-seed', document });
const factoryUser = schemaAPI.generate({ $ref: '#/components/schemas/User' });
console.log('Factory Generated User Email:', factoryUser.email);

console.log('\n=== Examples Complete ===');