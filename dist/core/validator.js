"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OASValidator = void 0;
exports.createValidator = createValidator;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
class OASValidator {
    ajv;
    logger;
    config;
    compiledValidators = new Map();
    openApiVersion;
    constructor(document, options = {}) {
        this.config = {
            requests: options.config?.requests ?? true,
            responses: options.config?.responses ?? 'warn'
        };
        this.logger = options.logger;
        this.openApiVersion = options.openApiVersion ?? '3.0';
        // Configure AJV with appropriate settings for OpenAPI
        this.ajv = new ajv_1.default({
            allErrors: true,
            verbose: true,
            strict: false, // OpenAPI schemas often have non-standard keywords
            removeAdditional: false,
            coerceTypes: true, // Convert string numbers to numbers, etc.
            useDefaults: true,
            formats: {
                // Add OpenAPI-specific formats
                int32: /^-?\d+$/,
                int64: /^-?\d+$/,
                float: /^-?\d+(\.\d+)?$/,
                double: /^-?\d+(\.\d+)?$/,
                byte: /^[A-Za-z0-9+/]*={0,2}$/, // Base64
                binary: true, // Accept any string for binary
                password: true // Accept any string for password
            }
        });
        // Add standard formats (date, time, email, etc.)
        (0, ajv_formats_1.default)(this.ajv);
        // Add OpenAPI 3.1 specific configuration
        if (this.openApiVersion === '3.1') {
            this.ajv.addKeyword({
                keyword: 'example',
                schemaType: 'object',
                compile: () => () => true
            });
            this.ajv.addKeyword({
                keyword: 'examples',
                schemaType: 'object',
                compile: () => () => true
            });
        }
        // Pre-compile common schemas if document is provided
        if (document?.components?.schemas) {
            this.precompileSchemas(document.components.schemas);
        }
    }
    precompileSchemas(schemas) {
        for (const [name, schema] of Object.entries(schemas)) {
            if (this.isReference(schema)) {
                continue; // Skip references, they should be resolved already
            }
            try {
                const validate = this.ajv.compile(schema);
                this.compiledValidators.set(`#/components/schemas/${name}`, validate);
                this.logger?.debug(`Precompiled schema: ${name}`);
            }
            catch (error) {
                this.logger?.warn({ error, schema: name }, `Failed to precompile schema: ${name}`);
            }
        }
    }
    validate(schema, data) {
        let validateFn;
        if (this.isReference(schema)) {
            // Try to use precompiled validator for references
            const cached = this.compiledValidators.get(schema.$ref);
            if (cached) {
                validateFn = cached;
            }
            else {
                this.logger?.warn({ ref: schema.$ref }, 'No precompiled validator found for reference');
                return {
                    valid: false,
                    errors: [{
                            instancePath: '',
                            schemaPath: '',
                            keyword: 'reference',
                            message: `Unresolved reference: ${schema.$ref}`
                        }]
                };
            }
        }
        else {
            try {
                validateFn = this.ajv.compile(schema);
            }
            catch (error) {
                this.logger?.error({ error, schema }, 'Failed to compile schema');
                return {
                    valid: false,
                    errors: [{
                            instancePath: '',
                            schemaPath: '',
                            keyword: 'compile',
                            message: `Schema compilation failed: ${error}`
                        }]
                };
            }
        }
        const valid = validateFn(data);
        if (!valid && validateFn.errors) {
            return {
                valid: false,
                errors: validateFn.errors.map(this.transformError)
            };
        }
        return { valid: true };
    }
    generate(schema, options = {}) {
        // This is a placeholder implementation for schema-based data generation
        // In a full implementation, you would use a library like json-schema-faker
        this.logger?.debug({ schema, options }, 'Generate called - placeholder implementation');
        if (this.isReference(schema)) {
            throw new Error(`Cannot generate data for unresolved reference: ${schema.$ref}`);
        }
        return this.generateFromSchema(schema, options);
    }
    generateFromSchema(schema, options) {
        // Simple generation based on schema type
        // This is a minimal implementation - a real implementation would be much more sophisticated
        if (schema.example !== undefined && options.useExamples !== false) {
            return schema.example;
        }
        if (schema.default !== undefined) {
            return schema.default;
        }
        switch (schema.type) {
            case 'string':
                if (schema.enum)
                    return schema.enum[0];
                if (schema.format === 'date-time')
                    return new Date().toISOString();
                if (schema.format === 'date')
                    return new Date().toISOString().split('T')[0];
                if (schema.format === 'email')
                    return 'user@example.com';
                if (schema.format === 'uuid')
                    return '12345678-1234-1234-1234-123456789012';
                return 'string';
            case 'number':
            case 'integer':
                if (schema.enum)
                    return schema.enum[0];
                if (schema.minimum !== undefined)
                    return schema.minimum;
                if (schema.maximum !== undefined)
                    return schema.maximum;
                return schema.type === 'integer' ? 42 : 3.14;
            case 'boolean':
                return true;
            case 'array':
                if (schema.items) {
                    const itemSchema = this.isReference(schema.items) ?
                        { type: 'string' } : // Fallback for unresolved refs
                        schema.items;
                    return [this.generateFromSchema(itemSchema, options)];
                }
                return [];
            case 'object':
                const obj = {};
                if (schema.properties) {
                    for (const [prop, propSchema] of Object.entries(schema.properties)) {
                        const isRequired = schema.required?.includes(prop) ?? false;
                        if (isRequired || Math.random() > 0.5) { // Randomly include optional properties
                            if (this.isReference(propSchema)) {
                                obj[prop] = null; // Fallback for unresolved refs
                            }
                            else {
                                obj[prop] = this.generateFromSchema(propSchema, options);
                            }
                        }
                    }
                }
                return obj;
            default:
                return null;
        }
    }
    validateRequest(operation, request) {
        if (!this.config.requests) {
            return null;
        }
        const errors = [];
        // Validate path parameters
        errors.push(...this.validatePathParameters(operation, request));
        // Validate query parameters  
        errors.push(...this.validateQueryParameters(operation, request));
        // Validate headers
        errors.push(...this.validateHeaders(operation, request));
        // Validate cookies
        errors.push(...this.validateCookies(operation, request));
        // Validate request body
        errors.push(...this.validateRequestBody(operation, request));
        if (errors.length > 0) {
            return this.createProblemDetail(400, 'Request validation failed', errors, request.path);
        }
        return null;
    }
    validateResponse(operation, response) {
        if (this.config.responses === false) {
            return null;
        }
        const errors = [];
        const statusCode = response.status.toString();
        // Find response definition for status code
        const responseSchema = operation.responses[statusCode] ||
            operation.responses['default'] ||
            operation.responses[`${Math.floor(response.status / 100)}XX`];
        if (!responseSchema) {
            const error = {
                instancePath: '/status',
                schemaPath: '/responses',
                keyword: 'enum',
                message: `Response status ${statusCode} not defined in OpenAPI spec`
            };
            errors.push(error);
        }
        else {
            // Validate response headers
            errors.push(...this.validateResponseHeaders(responseSchema, response));
            // Validate response body
            errors.push(...this.validateResponseBody(responseSchema, response));
        }
        if (errors.length > 0) {
            const problem = this.createProblemDetail(500, 'Response validation failed', errors);
            if (this.config.responses === 'warn') {
                this.logger?.warn({ problem }, 'Response validation failed');
                return null; // Don't fail the request
            }
            else {
                return problem; // Fail the request in strict mode
            }
        }
        return null;
    }
    validatePathParameters(operation, request) {
        const errors = [];
        const pathParams = request.pathParams || {};
        const pathParameters = operation.parameters.filter(p => p.in === 'path');
        for (const param of pathParameters) {
            const value = pathParams[param.name];
            if (param.required && (value === undefined || value === '')) {
                errors.push({
                    instancePath: `/path/${param.name}`,
                    schemaPath: `/parameters/${param.name}/required`,
                    keyword: 'required',
                    message: `Missing required path parameter: ${param.name}`
                });
                continue;
            }
            if (value !== undefined && param.schema) {
                const result = this.validate(param.schema, value);
                if (!result.valid && result.errors) {
                    for (const error of result.errors) {
                        errors.push({
                            ...error,
                            instancePath: `/path/${param.name}${error.instancePath}`,
                            schemaPath: `/parameters/${param.name}/schema${error.schemaPath}`
                        });
                    }
                }
            }
        }
        return errors;
    }
    validateQueryParameters(operation, request) {
        const errors = [];
        const queryParameters = operation.parameters.filter(p => p.in === 'query');
        for (const param of queryParameters) {
            const value = request.query[param.name];
            if (param.required && (value === undefined || value === '')) {
                errors.push({
                    instancePath: `/query/${param.name}`,
                    schemaPath: `/parameters/${param.name}/required`,
                    keyword: 'required',
                    message: `Missing required query parameter: ${param.name}`
                });
                continue;
            }
            if (value !== undefined && param.schema) {
                const result = this.validate(param.schema, value);
                if (!result.valid && result.errors) {
                    for (const error of result.errors) {
                        errors.push({
                            ...error,
                            instancePath: `/query/${param.name}${error.instancePath}`,
                            schemaPath: `/parameters/${param.name}/schema${error.schemaPath}`
                        });
                    }
                }
            }
        }
        return errors;
    }
    validateHeaders(operation, request) {
        const errors = [];
        const headerParameters = operation.parameters.filter(p => p.in === 'header');
        for (const param of headerParameters) {
            const value = request.headers[param.name.toLowerCase()];
            if (param.required && (value === undefined || value === '')) {
                errors.push({
                    instancePath: `/headers/${param.name}`,
                    schemaPath: `/parameters/${param.name}/required`,
                    keyword: 'required',
                    message: `Missing required header: ${param.name}`
                });
                continue;
            }
            if (value !== undefined && param.schema) {
                const result = this.validate(param.schema, value);
                if (!result.valid && result.errors) {
                    for (const error of result.errors) {
                        errors.push({
                            ...error,
                            instancePath: `/headers/${param.name}${error.instancePath}`,
                            schemaPath: `/parameters/${param.name}/schema${error.schemaPath}`
                        });
                    }
                }
            }
        }
        return errors;
    }
    validateCookies(operation, request) {
        const errors = [];
        const cookieParameters = operation.parameters.filter(p => p.in === 'cookie');
        for (const param of cookieParameters) {
            const value = request.cookies[param.name];
            if (param.required && (value === undefined || value === '')) {
                errors.push({
                    instancePath: `/cookies/${param.name}`,
                    schemaPath: `/parameters/${param.name}/required`,
                    keyword: 'required',
                    message: `Missing required cookie: ${param.name}`
                });
                continue;
            }
            if (value !== undefined && param.schema) {
                const result = this.validate(param.schema, value);
                if (!result.valid && result.errors) {
                    for (const error of result.errors) {
                        errors.push({
                            ...error,
                            instancePath: `/cookies/${param.name}${error.instancePath}`,
                            schemaPath: `/parameters/${param.name}/schema${error.schemaPath}`
                        });
                    }
                }
            }
        }
        return errors;
    }
    validateRequestBody(operation, request) {
        const errors = [];
        if (!operation.requestBodySchema) {
            return errors;
        }
        if (request.body === undefined || request.body === null) {
            // Check if request body is required
            if (operation.operation.requestBody &&
                typeof operation.operation.requestBody === 'object' &&
                !('$ref' in operation.operation.requestBody) &&
                operation.operation.requestBody.required) {
                errors.push({
                    instancePath: '/body',
                    schemaPath: '/requestBody/required',
                    keyword: 'required',
                    message: 'Request body is required'
                });
            }
            return errors;
        }
        const result = this.validate(operation.requestBodySchema, request.body);
        if (!result.valid && result.errors) {
            for (const error of result.errors) {
                errors.push({
                    ...error,
                    instancePath: `/body${error.instancePath}`,
                    schemaPath: `/requestBody/content/*/schema${error.schemaPath}`
                });
            }
        }
        return errors;
    }
    validateResponseHeaders(responseSchema, response) {
        const errors = [];
        if (!responseSchema.headers) {
            return errors;
        }
        for (const [headerName, headerSpec] of Object.entries(responseSchema.headers)) {
            if (typeof headerSpec === 'object' && headerSpec !== null && !('$ref' in headerSpec)) {
                const header = headerSpec; // Cast to handle unknown structure
                if (header.schema) {
                    const value = response.headers[headerName.toLowerCase()];
                    if (header.required && (value === undefined || value === '')) {
                        errors.push({
                            instancePath: `/headers/${headerName}`,
                            schemaPath: `/responses/*/headers/${headerName}/required`,
                            keyword: 'required',
                            message: `Missing required response header: ${headerName}`
                        });
                        continue;
                    }
                    if (value !== undefined) {
                        const result = this.validate(header.schema, value);
                        if (!result.valid && result.errors) {
                            for (const error of result.errors) {
                                errors.push({
                                    ...error,
                                    instancePath: `/headers/${headerName}${error.instancePath}`,
                                    schemaPath: `/responses/*/headers/${headerName}/schema${error.schemaPath}`
                                });
                            }
                        }
                    }
                }
            }
        }
        return errors;
    }
    validateResponseBody(responseSchema, response) {
        const errors = [];
        if (!responseSchema.content) {
            return errors;
        }
        // Find content type schema (prefer application/json)
        const contentType = response.headers['content-type'] || 'application/json';
        const mediaType = responseSchema.content[contentType] ||
            responseSchema.content['application/json'] ||
            Object.values(responseSchema.content)[0];
        if (!mediaType || !mediaType.schema) {
            return errors;
        }
        if (response.body !== undefined) {
            const result = this.validate(mediaType.schema, response.body);
            if (!result.valid && result.errors) {
                for (const error of result.errors) {
                    errors.push({
                        ...error,
                        instancePath: `/body${error.instancePath}`,
                        schemaPath: `/responses/*/content/*/schema${error.schemaPath}`
                    });
                }
            }
        }
        return errors;
    }
    transformError(error) {
        return {
            instancePath: error.instancePath,
            schemaPath: error.schemaPath,
            keyword: error.keyword,
            message: error.message || 'Validation failed',
            params: error.params
        };
    }
    createProblemDetail(status, title, errors, instance) {
        const problemDetail = {
            type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
            title,
            status,
            detail: `Validation failed with ${errors.length} error(s)`,
            details: errors
        };
        if (instance !== undefined) {
            problemDetail.instance = instance;
        }
        return problemDetail;
    }
    isReference(value) {
        return typeof value === 'object' && value !== null && '$ref' in value;
    }
}
exports.OASValidator = OASValidator;
function createValidator(document, options = {}) {
    return new OASValidator(document, options);
}
//# sourceMappingURL=validator.js.map