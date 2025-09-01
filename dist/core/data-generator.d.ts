import { Schema, Reference, SchemaAPI, GenerateOptions, OpenAPIDocument } from '../types';
export interface DataGeneratorOptions {
    seed?: string;
    useExamples?: boolean;
    maxArrayItems?: number;
    maxObjectProperties?: number;
    maxStringLength?: number;
    document?: OpenAPIDocument;
}
export declare class DataGenerator implements SchemaAPI {
    private ajv;
    private options;
    private rng;
    constructor(options?: DataGeneratorOptions);
    /**
     * Validate data against a schema
     */
    validate(schema: Schema | Reference, data: any): {
        valid: boolean;
        errors?: any[];
    };
    /**
     * Generate data from a schema
     */
    generate(schema: Schema | Reference, options?: GenerateOptions): any;
    private generateFromSchema;
    private generateFromReference;
    private generateString;
    private generateNumber;
    private generateInteger;
    private generateBoolean;
    private generateArray;
    private generateObject;
    private generateEnum;
    private generateWeightedEnum;
    private generateFromFakerHint;
    private generateAllOf;
    private generateAnyOf;
    private generateOneOf;
    private generateMixed;
    private resolveSchema;
    private resolveReference;
    private isReference;
    private createSeededRng;
    private hashString;
    /**
     * Update the seed for deterministic generation
     */
    setSeed(seed: string): void;
    /**
     * Update the OpenAPI document for reference resolution
     */
    setDocument(document: OpenAPIDocument): void;
}
/**
 * Factory function to create a DataGenerator instance
 */
export declare function createDataGenerator(options?: DataGeneratorOptions): DataGenerator;
/**
 * Create a schema API instance
 */
export declare function createSchemaAPI(options?: DataGeneratorOptions): SchemaAPI;
//# sourceMappingURL=data-generator.d.ts.map