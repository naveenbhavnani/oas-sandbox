import { OpenAPIDocument, ResolvedOperation, Reference, Schema } from '../types';
export declare class OpenAPILoader {
    private document;
    private operations;
    load(source: string | OpenAPIDocument): Promise<void>;
    private loadFromFile;
    private resolveReferences;
    private resolveLocalReference;
    private extractOperations;
    getDocument(): OpenAPIDocument;
    getOperations(): Map<string, ResolvedOperation>;
    getOperation(operationId: string): ResolvedOperation | undefined;
    findOperationsByPath(method: string, path: string): ResolvedOperation[];
    extractPathParams(operation: ResolvedOperation, path: string): Record<string, string>;
    getComponentSchema(ref: string): Schema | undefined;
    isReference(value: any): value is Reference;
}
export declare function loadOpenAPI(source: string | OpenAPIDocument): Promise<OpenAPILoader>;
//# sourceMappingURL=loader.d.ts.map