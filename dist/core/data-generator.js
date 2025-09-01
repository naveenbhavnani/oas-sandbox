"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGenerator = void 0;
exports.createDataGenerator = createDataGenerator;
exports.createSchemaAPI = createSchemaAPI;
const faker_1 = require("@faker-js/faker");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const uuid_1 = require("uuid");
class DataGenerator {
    ajv;
    options;
    rng;
    constructor(options = {}) {
        this.options = {
            seed: options.seed || 'default-seed',
            useExamples: options.useExamples ?? true,
            maxArrayItems: options.maxArrayItems || 10,
            maxObjectProperties: options.maxObjectProperties || 20,
            maxStringLength: options.maxStringLength || 100,
            document: options.document
        };
        // Initialize seeded RNG
        this.rng = this.createSeededRng(this.options.seed);
        // Configure faker with seed
        faker_1.faker.seed(this.hashString(this.options.seed));
        // Initialize AJV for validation
        this.ajv = new ajv_1.default({
            allErrors: true,
            strict: false,
            validateFormats: true
        });
        (0, ajv_formats_1.default)(this.ajv);
    }
    /**
     * Validate data against a schema
     */
    validate(schema, data) {
        try {
            const resolvedSchema = this.resolveSchema(schema);
            const validate = this.ajv.compile(resolvedSchema);
            const valid = validate(data);
            if (valid) {
                return { valid: true };
            }
            else {
                return { valid: false, errors: validate.errors || [] };
            }
        }
        catch (error) {
            return {
                valid: false,
                errors: [{ message: error instanceof Error ? error.message : String(error) }]
            };
        }
    }
    /**
     * Generate data from a schema
     */
    generate(schema, options = {}) {
        const context = {
            depth: 0,
            maxDepth: 10,
            visitedRefs: new Set(),
            seed: options.seed || this.options.seed,
            rng: options.seed ? this.createSeededRng(options.seed) : this.rng,
            useExamples: options.useExamples ?? this.options.useExamples,
            document: this.options.document
        };
        try {
            return this.generateFromSchema(schema, context);
        }
        catch (error) {
            // Return null for generation errors to avoid breaking the system
            console.warn('Data generation failed:', error);
            return null;
        }
    }
    generateFromSchema(schema, context) {
        // Prevent infinite recursion
        if (context.depth > context.maxDepth) {
            return null;
        }
        // Handle references
        if (this.isReference(schema)) {
            return this.generateFromReference(schema, context);
        }
        const resolvedSchema = schema;
        // Check for examples first if enabled
        if (context.useExamples && resolvedSchema.example !== undefined) {
            return resolvedSchema.example;
        }
        // Handle enum values with x-sandbox weighting
        if (resolvedSchema.enum) {
            return this.generateEnum(resolvedSchema, context);
        }
        // Handle x-sandbox faker hints
        if (resolvedSchema['x-sandbox']?.faker) {
            return this.generateFromFakerHint(resolvedSchema['x-sandbox'].faker);
        }
        // Handle schema composition
        if (resolvedSchema.allOf) {
            return this.generateAllOf(resolvedSchema.allOf, context);
        }
        if (resolvedSchema.anyOf) {
            return this.generateAnyOf(resolvedSchema.anyOf, context);
        }
        if (resolvedSchema.oneOf) {
            return this.generateOneOf(resolvedSchema.oneOf, context);
        }
        // Handle by type
        switch (resolvedSchema.type) {
            case 'string':
                return this.generateString(resolvedSchema, context);
            case 'number':
                return this.generateNumber(resolvedSchema, context);
            case 'integer':
                return this.generateInteger(resolvedSchema, context);
            case 'boolean':
                return this.generateBoolean(resolvedSchema, context);
            case 'array':
                return this.generateArray(resolvedSchema, context);
            case 'object':
                return this.generateObject(resolvedSchema, context);
            case 'null':
                return null;
            default:
                // If no type specified, try to infer from properties
                if (resolvedSchema.properties || resolvedSchema.additionalProperties !== undefined) {
                    return this.generateObject(resolvedSchema, context);
                }
                if (resolvedSchema.items) {
                    return this.generateArray(resolvedSchema, context);
                }
                // Default fallback
                return this.generateMixed(resolvedSchema, context);
        }
    }
    generateFromReference(ref, context) {
        const refKey = ref.$ref;
        // Prevent circular references
        if (context.visitedRefs.has(refKey)) {
            return null;
        }
        context.visitedRefs.add(refKey);
        try {
            const resolvedSchema = this.resolveReference(ref, context.document);
            const result = this.generateFromSchema(resolvedSchema, {
                ...context,
                depth: context.depth + 1
            });
            context.visitedRefs.delete(refKey);
            return result;
        }
        catch (error) {
            context.visitedRefs.delete(refKey);
            return null;
        }
    }
    generateString(schema, context) {
        // Handle format-specific generation
        if (schema.format) {
            switch (schema.format) {
                case 'uuid':
                    return (0, uuid_1.v4)();
                case 'email':
                    return faker_1.faker.internet.email();
                case 'uri':
                case 'url':
                    return faker_1.faker.internet.url();
                case 'hostname':
                    return faker_1.faker.internet.domainName();
                case 'ipv4':
                    return faker_1.faker.internet.ip();
                case 'ipv6':
                    return faker_1.faker.internet.ipv6();
                case 'date':
                    return faker_1.faker.date.recent().toISOString().split('T')[0];
                case 'date-time':
                    return faker_1.faker.date.recent().toISOString();
                case 'time':
                    return faker_1.faker.date.recent().toISOString().split('T')[1];
                case 'password':
                    return faker_1.faker.internet.password();
                case 'byte':
                    return Buffer.from(faker_1.faker.lorem.words()).toString('base64');
                case 'binary':
                    return faker_1.faker.datatype.hexadecimal({ length: 16 });
            }
        }
        // Handle pattern constraints
        if (schema.pattern) {
            // Simple pattern matching for common cases
            if (schema.pattern.includes('[a-zA-Z]') || schema.pattern.includes('\\w')) {
                return faker_1.faker.lorem.word();
            }
            if (schema.pattern.includes('[0-9]') || schema.pattern.includes('\\d')) {
                return faker_1.faker.datatype.number({ min: 1000, max: 9999 }).toString();
            }
        }
        // Handle length constraints
        let result = '';
        const minLength = schema.minLength || 0;
        const maxLength = Math.min(schema.maxLength || this.options.maxStringLength, this.options.maxStringLength);
        if (minLength === 0 && maxLength === 0) {
            return '';
        }
        // Generate appropriate content based on context
        const targetLength = minLength + Math.floor(context.rng() * (maxLength - minLength + 1));
        if (targetLength <= 10) {
            result = faker_1.faker.lorem.word();
        }
        else if (targetLength <= 50) {
            result = faker_1.faker.lorem.words(Math.ceil(targetLength / 8));
        }
        else {
            result = faker_1.faker.lorem.paragraph();
        }
        // Adjust length to constraints
        if (result.length < minLength) {
            result = result.padEnd(minLength, 'a');
        }
        if (result.length > maxLength) {
            result = result.substring(0, maxLength);
        }
        return result;
    }
    generateNumber(schema, context) {
        const min = schema.minimum ?? -1000000;
        const max = schema.maximum ?? 1000000;
        const multipleOf = schema.multipleOf;
        let result = min + context.rng() * (max - min);
        if (multipleOf) {
            result = Math.floor(result / multipleOf) * multipleOf;
        }
        // Handle exclusive bounds
        if (schema.exclusiveMinimum && result <= min) {
            result = min + (multipleOf || 0.01);
        }
        if (schema.exclusiveMaximum && result >= max) {
            result = max - (multipleOf || 0.01);
        }
        return result;
    }
    generateInteger(schema, context) {
        const min = Math.ceil(schema.minimum ?? -1000000);
        const max = Math.floor(schema.maximum ?? 1000000);
        const multipleOf = schema.multipleOf;
        let result = min + Math.floor(context.rng() * (max - min + 1));
        if (multipleOf) {
            result = Math.floor(result / multipleOf) * multipleOf;
        }
        // Handle exclusive bounds
        if (schema.exclusiveMinimum && result <= min) {
            result = min + (multipleOf || 1);
        }
        if (schema.exclusiveMaximum && result >= max) {
            result = max - (multipleOf || 1);
        }
        return Math.floor(result);
    }
    generateBoolean(_schema, context) {
        return context.rng() > 0.5;
    }
    generateArray(schema, context) {
        const minItems = schema.minItems || 0;
        const maxItems = Math.min(schema.maxItems || this.options.maxArrayItems, this.options.maxArrayItems);
        const length = minItems + Math.floor(context.rng() * (maxItems - minItems + 1));
        const result = [];
        if (!schema.items) {
            return result;
        }
        const newContext = { ...context, depth: context.depth + 1 };
        for (let i = 0; i < length; i++) {
            const item = this.generateFromSchema(schema.items, newContext);
            result.push(item);
            // For uniqueItems constraint, avoid duplicates (basic check)
            if (schema.uniqueItems && result.includes(item) && result.length > 1) {
                result.pop(); // Remove duplicate
            }
        }
        return result;
    }
    generateObject(schema, context) {
        const result = {};
        const newContext = { ...context, depth: context.depth + 1 };
        // Handle required properties first
        if (schema.required) {
            for (const propName of schema.required) {
                if (schema.properties && schema.properties[propName]) {
                    result[propName] = this.generateFromSchema(schema.properties[propName], newContext);
                }
            }
        }
        // Add additional properties up to constraints
        const maxProps = Math.min(schema.maxProperties || this.options.maxObjectProperties, this.options.maxObjectProperties);
        // Add more properties from schema.properties if needed
        if (schema.properties && Object.keys(result).length < maxProps) {
            const remainingProps = Object.keys(schema.properties)
                .filter(key => !(key in result))
                .slice(0, maxProps - Object.keys(result).length);
            for (const propName of remainingProps) {
                if (Object.keys(result).length >= maxProps)
                    break;
                // Randomly decide whether to include optional properties
                if (!schema.required?.includes(propName) && context.rng() < 0.3) {
                    continue; // Skip some optional properties
                }
                result[propName] = this.generateFromSchema(schema.properties[propName], newContext);
            }
        }
        // Handle additionalProperties
        if (schema.additionalProperties && Object.keys(result).length < maxProps) {
            const additionalCount = Math.min(maxProps - Object.keys(result).length, Math.floor(context.rng() * 3) // Random 0-2 additional props
            );
            for (let i = 0; i < additionalCount; i++) {
                const propName = `additionalProp${i + 1}`;
                if (schema.additionalProperties === true) {
                    result[propName] = faker_1.faker.lorem.word();
                }
                else {
                    result[propName] = this.generateFromSchema(schema.additionalProperties, newContext);
                }
            }
        }
        return result;
    }
    generateEnum(schema, context) {
        if (!schema.enum || schema.enum.length === 0) {
            return null;
        }
        // Handle x-sandbox enum weighting
        const weights = schema['x-sandbox']?.enumWeights;
        if (weights && typeof weights === 'object') {
            return this.generateWeightedEnum(schema.enum, weights, context);
        }
        // Simple random selection
        const index = Math.floor(context.rng() * schema.enum.length);
        return schema.enum[index];
    }
    generateWeightedEnum(enumValues, weights, context) {
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = context.rng() * totalWeight;
        for (let i = 0; i < enumValues.length; i++) {
            const value = enumValues[i];
            const weight = weights[String(value)] || weights[i] || 1;
            random -= weight;
            if (random <= 0) {
                return value;
            }
        }
        // Fallback to last item
        return enumValues[enumValues.length - 1];
    }
    generateFromFakerHint(fakerHint) {
        try {
            // Parse faker hint like "name.firstName" or "internet.email"
            const parts = fakerHint.split('.');
            let fakerMethod = faker_1.faker;
            for (const part of parts) {
                if (fakerMethod && typeof fakerMethod[part] === 'function') {
                    fakerMethod = fakerMethod[part];
                }
                else if (fakerMethod && fakerMethod[part]) {
                    fakerMethod = fakerMethod[part];
                }
                else {
                    throw new Error(`Invalid faker method: ${fakerHint}`);
                }
            }
            if (typeof fakerMethod === 'function') {
                return fakerMethod();
            }
            return faker_1.faker.lorem.word(); // Fallback
        }
        catch (error) {
            return faker_1.faker.lorem.word(); // Fallback on error
        }
    }
    generateAllOf(schemas, context) {
        // Merge all schemas and generate
        const mergedSchema = { type: 'object' };
        for (const schema of schemas) {
            const resolved = this.resolveSchema(schema);
            if (resolved.properties) {
                mergedSchema.properties = { ...mergedSchema.properties, ...resolved.properties };
            }
            if (resolved.required) {
                mergedSchema.required = [...(mergedSchema.required || []), ...resolved.required];
            }
        }
        return this.generateFromSchema(mergedSchema, context);
    }
    generateAnyOf(schemas, context) {
        // Pick one schema randomly
        const index = Math.floor(context.rng() * schemas.length);
        return this.generateFromSchema(schemas[index], context);
    }
    generateOneOf(schemas, context) {
        // Pick one schema randomly (same as anyOf for generation purposes)
        const index = Math.floor(context.rng() * schemas.length);
        return this.generateFromSchema(schemas[index], context);
    }
    generateMixed(schema, context) {
        // Fallback for schemas without explicit type
        if (schema.enum) {
            return this.generateEnum(schema, context);
        }
        // Make a best guess based on available constraints
        if (schema.minLength !== undefined || schema.maxLength !== undefined || schema.pattern) {
            return this.generateString({ ...schema, type: 'string' }, context);
        }
        if (schema.minimum !== undefined || schema.maximum !== undefined) {
            return this.generateNumber({ ...schema, type: 'number' }, context);
        }
        if (schema.properties) {
            return this.generateObject({ ...schema, type: 'object' }, context);
        }
        if (schema.items) {
            return this.generateArray({ ...schema, type: 'array' }, context);
        }
        return faker_1.faker.lorem.word(); // Final fallback
    }
    resolveSchema(schema) {
        if (this.isReference(schema)) {
            return this.resolveReference(schema, this.options.document);
        }
        return schema;
    }
    resolveReference(ref, document) {
        if (!document) {
            throw new Error(`Cannot resolve reference ${ref.$ref} without document context`);
        }
        const refPath = ref.$ref;
        if (!refPath.startsWith('#/')) {
            throw new Error(`External references not supported: ${refPath}`);
        }
        const path = refPath.substring(2).split('/');
        let current = document;
        for (const segment of path) {
            if (current && typeof current === 'object' && segment in current) {
                current = current[segment];
            }
            else {
                throw new Error(`Reference not found: ${refPath}`);
            }
        }
        return current;
    }
    isReference(value) {
        return typeof value === 'object' && value !== null && '$ref' in value;
    }
    createSeededRng(seed) {
        // Simple seeded PRNG based on mulberry32
        let a = this.hashString(seed);
        return () => {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    hashString(str) {
        let hash = 0;
        if (str.length === 0)
            return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    /**
     * Update the seed for deterministic generation
     */
    setSeed(seed) {
        this.options.seed = seed;
        this.rng = this.createSeededRng(seed);
        faker_1.faker.seed(this.hashString(seed));
    }
    /**
     * Update the OpenAPI document for reference resolution
     */
    setDocument(document) {
        this.options.document = document;
    }
}
exports.DataGenerator = DataGenerator;
/**
 * Factory function to create a DataGenerator instance
 */
function createDataGenerator(options = {}) {
    return new DataGenerator(options);
}
/**
 * Create a schema API instance
 */
function createSchemaAPI(options = {}) {
    return new DataGenerator(options);
}
//# sourceMappingURL=data-generator.js.map