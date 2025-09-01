import { describe, it, expect } from 'vitest';
import { Sandbox } from '../../src/sandbox';

describe('Sandbox', () => {
  it('should create a sandbox instance', () => {
    const sandbox = new Sandbox({
      oas: {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      }
    });
    expect(sandbox).toBeInstanceOf(Sandbox);
  });
});