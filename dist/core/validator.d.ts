import { Schema, Reference, SchemaAPI, GenerateOptions, ResolvedOperation, SandboxRequest, SandboxResponse, ValidationConfig, OpenAPIDocument } from '../types';
import { Logger } from 'pino';
export interface ProblemDetail {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    details?: ValidationError[];
}
export interface ValidationError {
    instancePath: string;
    schemaPath: string;
    keyword: string;
    message: string;
    params?: Record<string, any>;
}
export interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
}
export interface ValidatorOptions {
    config?: ValidationConfig;
    logger?: Logger;
    openApiVersion?: '3.0' | '3.1';
}
export declare class OASValidator implements SchemaAPI {
    private ajv;
    private logger;
    private config;
    private compiledValidators;
    private openApiVersion;
    constructor(document?: OpenAPIDocument, options?: ValidatorOptions);
    private precompileSchemas;
    validate(schema: Schema | Reference, data: any): ValidationResult;
    generate(schema: Schema | Reference, options?: GenerateOptions): any;
    private generateFromSchema;
    validateRequest(operation: ResolvedOperation, request: SandboxRequest): ProblemDetail | null;
    validateResponse(operation: ResolvedOperation, response: SandboxResponse): ProblemDetail | null;
    private validatePathParameters;
    private validateQueryParameters;
    private validateHeaders;
    private validateCookies;
    private validateRequestBody;
    private validateResponseHeaders;
    private validateResponseBody;
    private transformError;
    private createProblemDetail;
    private isReference;
}
export declare function createValidator(document?: OpenAPIDocument, options?: ValidatorOptions): OASValidator;
//# sourceMappingURL=validator.d.ts.map