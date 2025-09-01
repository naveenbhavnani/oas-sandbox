import { describe, it, expect } from 'vitest';
import { OpenAPILoader } from '../../src/core/loader';

describe('OpenAPILoader', () => {
  it('should create a loader instance', () => {
    const loader = new OpenAPILoader();
    expect(loader).toBeInstanceOf(OpenAPILoader);
  });

  it('should load a simple OpenAPI document', async () => {
    const loader = new OpenAPILoader();
    const document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: { '200': { description: 'OK' } }
          }
        }
      }
    };

    await loader.load(document);
    const operations = loader.getOperations();
    expect(operations.size).toBe(1);
    expect(operations.has('getUsers')).toBe(true);
  });
});