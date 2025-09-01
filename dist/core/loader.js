"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPILoader = void 0;
exports.loadOpenAPI = loadOpenAPI;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const path_to_regexp_1 = require("path-to-regexp");
class OpenAPILoader {
    document = null;
    operations = new Map();
    async load(source) {
        if (typeof source === 'string') {
            this.document = await this.loadFromFile(source);
        }
        else {
            this.document = source;
        }
        await this.resolveReferences();
        this.extractOperations();
    }
    async loadFromFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.json') {
            return JSON.parse(content);
        }
        else if (ext === '.yaml' || ext === '.yml') {
            return yaml.load(content);
        }
        else {
            throw new Error(`Unsupported file format: ${ext}`);
        }
    }
    async resolveReferences() {
        if (!this.document) {
            throw new Error('No document loaded');
        }
        // Simple reference resolution for local references
        // In a full implementation, this would handle remote references too
        this.document = JSON.parse(JSON.stringify(this.document, (_key, value) => {
            if (typeof value === 'object' && value !== null && '$ref' in value) {
                const ref = value.$ref;
                if (ref.startsWith('#/')) {
                    return this.resolveLocalReference(ref);
                }
            }
            return value;
        }));
    }
    resolveLocalReference(ref) {
        if (!this.document) {
            throw new Error('No document loaded');
        }
        const path = ref.substring(2).split('/'); // Remove '#/' prefix
        let current = this.document;
        for (const segment of path) {
            if (current && typeof current === 'object' && segment in current) {
                current = current[segment];
            }
            else {
                throw new Error(`Reference not found: ${ref}`);
            }
        }
        return current;
    }
    extractOperations() {
        if (!this.document) {
            throw new Error('No document loaded');
        }
        this.operations.clear();
        for (const [pathTemplate, pathItem] of Object.entries(this.document.paths)) {
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
            for (const method of methods) {
                const operation = pathItem[method];
                if (!operation)
                    continue;
                const operationId = operation.operationId || `${method}_${pathTemplate.replace(/[^a-zA-Z0-9]/g, '_')}`;
                // Convert OpenAPI path to regex
                const keys = [];
                const pathRegex = (0, path_to_regexp_1.pathToRegexp)(pathTemplate, keys);
                const paramNames = keys.map(key => key.name);
                // Resolve responses
                const responses = {};
                if (operation.responses) {
                    for (const [status, response] of Object.entries(operation.responses)) {
                        if (typeof response === 'object' && !('$ref' in response)) {
                            responses[status] = response;
                        }
                    }
                }
                // Collect all parameters (path, query, header, cookie)
                const parameters = [];
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
                let requestBodySchema;
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
                const resolvedOp = {
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
    getDocument() {
        if (!this.document) {
            throw new Error('No document loaded');
        }
        return this.document;
    }
    getOperations() {
        return new Map(this.operations);
    }
    getOperation(operationId) {
        return this.operations.get(operationId);
    }
    findOperationsByPath(method, path) {
        const matches = [];
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
    extractPathParams(operation, path) {
        const match = operation.pathRegex.exec(path);
        const params = {};
        if (match) {
            for (let i = 0; i < operation.paramNames.length; i++) {
                params[operation.paramNames[i]] = match[i + 1];
            }
        }
        return params;
    }
    getComponentSchema(ref) {
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
    isReference(value) {
        return typeof value === 'object' && value !== null && '$ref' in value;
    }
}
exports.OpenAPILoader = OpenAPILoader;
async function loadOpenAPI(source) {
    const loader = new OpenAPILoader();
    await loader.load(source);
    return loader;
}
//# sourceMappingURL=loader.js.map