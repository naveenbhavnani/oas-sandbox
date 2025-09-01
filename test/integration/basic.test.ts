import { describe, it, expect } from 'vitest';
import { createSandbox } from '../../src/sandbox';

describe('Basic Integration', () => {
  it('should create and initialize a sandbox', async () => {
    const sandbox = await createSandbox({
      oas: {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      }
    });
    
    expect(sandbox).toBeDefined();
    await sandbox.close();
  });
});