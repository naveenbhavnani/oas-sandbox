import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SandboxOptions } from '../types';
export interface ExpressAdapterOptions extends SandboxOptions {
    /**
     * CORS configuration (disabled by default)
     */
    cors?: {
        enabled: boolean;
        allowlist?: string[];
        credentials?: boolean;
        methods?: string[];
        headers?: string[];
    };
    /**
     * Base path for the sandbox routes (default: '/')
     */
    basePath?: string;
    /**
     * Custom error handler
     */
    errorHandler?: (error: Error, req: Request, res: Response, next: NextFunction) => void;
    /**
     * Enable request logging (default: true)
     */
    enableLogging?: boolean;
}
/**
 * Express middleware that integrates with the OAS Sandbox
 */
export declare class ExpressAdapter {
    private sandbox;
    private options;
    constructor(options: ExpressAdapterOptions);
    /**
     * Initialize the sandbox
     */
    initialize(): Promise<void>;
    /**
     * Get CORS middleware if enabled
     */
    private getCorsMiddleware;
    /**
     * Convert Express request to Sandbox request format
     */
    private convertRequest;
    /**
     * Get the main middleware function
     */
    middleware(): RequestHandler;
    /**
     * Get all middlewares (CORS + main) as an array
     */
    middlewares(): RequestHandler[];
    /**
     * Close the sandbox
     */
    close(): Promise<void>;
}
/**
 * Create Express adapter with options
 */
export declare function createExpressAdapter(options: ExpressAdapterOptions): Promise<ExpressAdapter>;
/**
 * Create Express middleware function directly
 */
export declare function createExpressMiddleware(options: ExpressAdapterOptions): Promise<RequestHandler>;
/**
 * Create multiple Express middlewares (CORS + main)
 */
export declare function createExpressMiddlewares(options: ExpressAdapterOptions): Promise<RequestHandler[]>;
//# sourceMappingURL=express.d.ts.map