import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { OpenAPIDocument, ResolvedOperation, Parameter, Reference, Schema } from '../types';
import { pathToRegexp, Key } from 'path-to-regexp';

export class OpenAPILoader {
  private document: OpenAPIDocument | null = null;
  private operations: Map<string, ResolvedOperation> = new Map();

  async load(source: string | OpenAPIDocument): Promise<void> {
    if (typeof source === 'string') {
      this.document = await this.loadFromFile(source);
    } else {
      this.document = source;
    }

    await this.resolveReferences();
    this.extractOperations();
  }

  private async loadFromFile(filePath: string): Promise<OpenAPIDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content) as OpenAPIDocument;
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  private async resolveReferences(): Promise<void> {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    // Simple reference resolution for local references
    // In a full implementation, this would handle remote references too
    this.document = JSON.parse(JSON.stringify(this.document, (_key, value) => {
      if (typeof value === 'object' && value !== null && '$ref' in value) {
        const ref = value.$ref as string;
        if (ref.startsWith('#/')) {
          return this.resolveLocalReference(ref);
        }
      }
      return value;
    }));
  }

  private resolveLocalReference(ref: string): any {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    const path = ref.substring(2).split('/'); // Remove '#/' prefix
    let current: any = this.document;

    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        throw new Error(`Reference not found: ${ref}`);
      }
    }

    return current;
  }

  private extractOperations(): void {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    this.operations.clear();

    for (const [pathTemplate, pathItem] of Object.entries(this.document.paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'] as const;
      
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        const operationId = operation.operationId || `${method}_${pathTemplate.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Convert OpenAPI path to regex
        const keys: Key[] = [];
        const pathRegex = pathToRegexp(pathTemplate, keys);
        const paramNames = keys.map(key => key.name as string);

        // Resolve responses
        const responses: Record<string, any> = {};
        if (operation.responses) {
          for (const [status, response] of Object.entries(operation.responses)) {
            if (typeof response === 'object' && !('$ref' in response)) {
              responses[status] = response;
            }
          }
        }

        // Collect all parameters (path, query, header, cookie)
        const parameters: Parameter[] = [];
        
        // Path-level parameters
        if (pathItem.parameters) {
          for (const param of pathItem.parameters) {
            if (typeof param === 'object' && !('$ref' in param)) {
              parameters.push(param);
            }
          }
        }

        // Operation-level parameters
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (typeof param === 'object' && !('$ref' in param)) {
              parameters.push(param);
            }
          }
        }

        // Extract request body schema
        let requestBodySchema: Schema | undefined;
        if (operation.requestBody && typeof operation.requestBody === 'object' && !('$ref' in operation.requestBody)) {
          const content = operation.requestBody.content;
          if (content) {
            // Try to find JSON content type
            const jsonContent = content['application/json'] || content['application/*'] || Object.values(content)[0];
            if (jsonContent?.schema && typeof jsonContent.schema === 'object' && !('$ref' in jsonContent.schema)) {
              requestBodySchema = jsonContent.schema;
            }
          }
        }

        const resolvedOp: ResolvedOperation = {
          operationId,
          method: method.toUpperCase(),
          path: pathTemplate,
          pathRegex,
          paramNames,
          operation,
          responses,
          parameters
        };
        
        if (requestBodySchema) {
          resolvedOp.requestBodySchema = requestBodySchema;
        }

        this.operations.set(operationId, resolvedOp);
      }
    }
  }

  getDocument(): OpenAPIDocument {
    if (!this.document) {
      throw new Error('No document loaded');
    }
    return this.document;
  }

  getOperations(): Map<string, ResolvedOperation> {
    return new Map(this.operations);
  }

  getOperation(operationId: string): ResolvedOperation | undefined {
    return this.operations.get(operationId);
  }

  findOperationsByPath(method: string, path: string): ResolvedOperation[] {
    const matches: ResolvedOperation[] = [];
    
    for (const operation of this.operations.values()) {
      if (operation.method === method.toUpperCase() && operation.pathRegex.test(path)) {
        matches.push(operation);
      }
    }

    // Sort by path specificity (more specific paths first)
    return matches.sort((a, b) => {
      const aParams = a.paramNames.length;
      const bParams = b.paramNames.length;
      const aLength = a.path.length;
      const bLength = b.path.length;
      
      // Prefer paths with fewer parameters
      if (aParams !== bParams) {
        return aParams - bParams;
      }
      
      // Prefer longer paths (more specific)
      return bLength - aLength;
    });
  }

  extractPathParams(operation: ResolvedOperation, path: string): Record<string, string> {
    const match = operation.pathRegex.exec(path);
    const params: Record<string, string> = {};
    
    if (match) {
      for (let i = 0; i < operation.paramNames.length; i++) {
        params[operation.paramNames[i]] = match[i + 1];
      }
    }
    
    return params;
  }

  getComponentSchema(ref: string): Schema | undefined {
    if (!this.document?.components?.schemas) {
      return undefined;
    }

    const schemaName = ref.replace('#/components/schemas/', '');
    const schema = this.document.components.schemas[schemaName];
    
    if (schema && typeof schema === 'object' && !('$ref' in schema)) {
      return schema;
    }
    
    return undefined;
  }

  isReference(value: any): value is Reference {
    return typeof value === 'object' && value !== null && '$ref' in value;
  }
}

export async function loadOpenAPI(source: string | OpenAPIDocument): Promise<OpenAPILoader> {
  const loader = new OpenAPILoader();
  await loader.load(source);
  return loader;
}