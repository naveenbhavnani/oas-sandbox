import { faker } from '@faker-js/faker';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { v4 as uuidv4 } from 'uuid';
import { 
  Schema, 
  Reference, 
  SchemaAPI, 
  GenerateOptions, 
  OpenAPIDocument
} from '../types';

export interface DataGeneratorOptions {
  seed?: string;
  useExamples?: boolean;
  maxArrayItems?: number;
  maxObjectProperties?: number;
  maxStringLength?: number;
  document?: OpenAPIDocument;
}

interface GenerationContext {
  depth: number;
  maxDepth: number;
  visitedRefs: Set<string>;
  seed: string;
  rng: () => number;
  useExamples: boolean;
  document?: OpenAPIDocument;
}

export class DataGenerator implements SchemaAPI {
  private ajv: Ajv;
  private options: Required<DataGeneratorOptions>;
  private rng: () => number;

  constructor(options: DataGeneratorOptions = {}) {
    this.options = {
      seed: options.seed || 'default-seed',
      useExamples: options.useExamples ?? true,
      maxArrayItems: options.maxArrayItems || 10,
      maxObjectProperties: options.maxObjectProperties || 20,
      maxStringLength: options.maxStringLength || 100,
      document: options.document
    } as Required<DataGeneratorOptions>;

    // Initialize seeded RNG
    this.rng = this.createSeededRng(this.options.seed);

    // Configure faker with seed
    faker.seed(this.hashString(this.options.seed));

    // Initialize AJV for validation
    this.ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      validateFormats: true
    });
    addFormats(this.ajv);
  }

  /**
   * Validate data against a schema
   */
  validate(schema: Schema | Reference, data: any): { valid: boolean; errors?: any[] } {
    try {
      const resolvedSchema = this.resolveSchema(schema);
      const validate = this.ajv.compile(resolvedSchema);
      const valid = validate(data);
      
      if (valid) {
        return { valid: true };
      } else {
        return { valid: false, errors: validate.errors || [] };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error instanceof Error ? error.message : String(error) }]
      };
    }
  }

  /**
   * Generate data from a schema
   */
  generate(schema: Schema | Reference, options: GenerateOptions = {}): any {
    const context: GenerationContext = {
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
    } catch (error) {
      // Return null for generation errors to avoid breaking the system
      console.warn('Data generation failed:', error);
      return null;
    }
  }

  private generateFromSchema(schema: Schema | Reference, context: GenerationContext): any {
    // Prevent infinite recursion
    if (context.depth > context.maxDepth) {
      return null;
    }

    // Handle references
    if (this.isReference(schema)) {
      return this.generateFromReference(schema, context);
    }

    const resolvedSchema = schema as Schema;

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

  private generateFromReference(ref: Reference, context: GenerationContext): any {
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
    } catch (error) {
      context.visitedRefs.delete(refKey);
      return null;
    }
  }

  private generateString(schema: Schema, context: GenerationContext): string {
    // Handle format-specific generation
    if (schema.format) {
      switch (schema.format) {
        case 'uuid':
          return uuidv4();
        case 'email':
          return faker.internet.email();
        case 'uri':
        case 'url':
          return faker.internet.url();
        case 'hostname':
          return faker.internet.domainName();
        case 'ipv4':
          return faker.internet.ip();
        case 'ipv6':
          return faker.internet.ipv6();
        case 'date':
          return faker.date.recent().toISOString().split('T')[0];
        case 'date-time':
          return faker.date.recent().toISOString();
        case 'time':
          return faker.date.recent().toISOString().split('T')[1];
        case 'password':
          return faker.internet.password();
        case 'byte':
          return Buffer.from(faker.lorem.words()).toString('base64');
        case 'binary':
          return faker.datatype.hexadecimal({ length: 16 });
      }
    }

    // Handle pattern constraints
    if (schema.pattern) {
      // Simple pattern matching for common cases
      if (schema.pattern.includes('[a-zA-Z]') || schema.pattern.includes('\\w')) {
        return faker.lorem.word();
      }
      if (schema.pattern.includes('[0-9]') || schema.pattern.includes('\\d')) {
        return faker.datatype.number({ min: 1000, max: 9999 }).toString();
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
      result = faker.lorem.word();
    } else if (targetLength <= 50) {
      result = faker.lorem.words(Math.ceil(targetLength / 8));
    } else {
      result = faker.lorem.paragraph();
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

  private generateNumber(schema: Schema, context: GenerationContext): number {
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

  private generateInteger(schema: Schema, context: GenerationContext): number {
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

  private generateBoolean(_schema: Schema, context: GenerationContext): boolean {
    return context.rng() > 0.5;
  }

  private generateArray(schema: Schema, context: GenerationContext): any[] {
    const minItems = schema.minItems || 0;
    const maxItems = Math.min(schema.maxItems || this.options.maxArrayItems, this.options.maxArrayItems);
    
    const length = minItems + Math.floor(context.rng() * (maxItems - minItems + 1));
    const result: any[] = [];

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

  private generateObject(schema: Schema, context: GenerationContext): Record<string, any> {
    const result: Record<string, any> = {};
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
    const maxProps = Math.min(
      schema.maxProperties || this.options.maxObjectProperties, 
      this.options.maxObjectProperties
    );

    // Add more properties from schema.properties if needed
    if (schema.properties && Object.keys(result).length < maxProps) {
      const remainingProps = Object.keys(schema.properties)
        .filter(key => !(key in result))
        .slice(0, maxProps - Object.keys(result).length);

      for (const propName of remainingProps) {
        if (Object.keys(result).length >= maxProps) break;
        
        // Randomly decide whether to include optional properties
        if (!schema.required?.includes(propName) && context.rng() < 0.3) {
          continue; // Skip some optional properties
        }

        result[propName] = this.generateFromSchema(schema.properties[propName], newContext);
      }
    }

    // Handle additionalProperties
    if (schema.additionalProperties && Object.keys(result).length < maxProps) {
      const additionalCount = Math.min(
        maxProps - Object.keys(result).length,
        Math.floor(context.rng() * 3) // Random 0-2 additional props
      );

      for (let i = 0; i < additionalCount; i++) {
        const propName = `additionalProp${i + 1}`;
        if (schema.additionalProperties === true) {
          result[propName] = faker.lorem.word();
        } else {
          result[propName] = this.generateFromSchema(schema.additionalProperties, newContext);
        }
      }
    }

    return result;
  }

  private generateEnum(schema: Schema, context: GenerationContext): any {
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

  private generateWeightedEnum(enumValues: any[], weights: Record<string, number>, context: GenerationContext): any {
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

  private generateFromFakerHint(fakerHint: string): any {
    try {
      // Parse faker hint like "name.firstName" or "internet.email"
      const parts = fakerHint.split('.');
      let fakerMethod: any = faker;

      for (const part of parts) {
        if (fakerMethod && typeof fakerMethod[part] === 'function') {
          fakerMethod = fakerMethod[part];
        } else if (fakerMethod && fakerMethod[part]) {
          fakerMethod = fakerMethod[part];
        } else {
          throw new Error(`Invalid faker method: ${fakerHint}`);
        }
      }

      if (typeof fakerMethod === 'function') {
        return fakerMethod();
      }

      return faker.lorem.word(); // Fallback
    } catch (error) {
      return faker.lorem.word(); // Fallback on error
    }
  }

  private generateAllOf(schemas: (Schema | Reference)[], context: GenerationContext): any {
    // Merge all schemas and generate
    const mergedSchema: Schema = { type: 'object' };
    
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

  private generateAnyOf(schemas: (Schema | Reference)[], context: GenerationContext): any {
    // Pick one schema randomly
    const index = Math.floor(context.rng() * schemas.length);
    return this.generateFromSchema(schemas[index], context);
  }

  private generateOneOf(schemas: (Schema | Reference)[], context: GenerationContext): any {
    // Pick one schema randomly (same as anyOf for generation purposes)
    const index = Math.floor(context.rng() * schemas.length);
    return this.generateFromSchema(schemas[index], context);
  }

  private generateMixed(schema: Schema, context: GenerationContext): any {
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

    return faker.lorem.word(); // Final fallback
  }

  private resolveSchema(schema: Schema | Reference): Schema {
    if (this.isReference(schema)) {
      return this.resolveReference(schema, this.options.document);
    }
    return schema;
  }

  private resolveReference(ref: Reference, document?: OpenAPIDocument): Schema {
    if (!document) {
      throw new Error(`Cannot resolve reference ${ref.$ref} without document context`);
    }

    const refPath = ref.$ref;
    if (!refPath.startsWith('#/')) {
      throw new Error(`External references not supported: ${refPath}`);
    }

    const path = refPath.substring(2).split('/');
    let current: any = document;

    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        throw new Error(`Reference not found: ${refPath}`);
      }
    }

    return current as Schema;
  }

  private isReference(value: any): value is Reference {
    return typeof value === 'object' && value !== null && '$ref' in value;
  }

  private createSeededRng(seed: string): () => number {
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

  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
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
  setSeed(seed: string): void {
    this.options.seed = seed;
    this.rng = this.createSeededRng(seed);
    faker.seed(this.hashString(seed));
  }

  /**
   * Update the OpenAPI document for reference resolution
   */
  setDocument(document: OpenAPIDocument): void {
    this.options.document = document;
  }
}

/**
 * Factory function to create a DataGenerator instance
 */
export function createDataGenerator(options: DataGeneratorOptions = {}): DataGenerator {
  return new DataGenerator(options);
}

/**
 * Create a schema API instance
 */
export function createSchemaAPI(options: DataGeneratorOptions = {}): SchemaAPI {
  return new DataGenerator(options);
}