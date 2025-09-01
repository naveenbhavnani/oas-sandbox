"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressAdapter = void 0;
exports.createExpressAdapter = createExpressAdapter;
exports.createExpressMiddleware = createExpressMiddleware;
exports.createExpressMiddlewares = createExpressMiddlewares;
const cors_1 = __importDefault(require("cors"));
const sandbox_1 = require("../sandbox");
/**
 * Express middleware that integrates with the OAS Sandbox
 */
class ExpressAdapter {
    sandbox;
    options;
    constructor(options) {
        this.options = {
            enableLogging: true,
            basePath: '/',
            ...options
        };
        this.sandbox = new sandbox_1.Sandbox(options);
    }
    /**
     * Initialize the sandbox
     */
    async initialize() {
        await this.sandbox.initialize();
    }
    /**
     * Get CORS middleware if enabled
     */
    getCorsMiddleware() {
        if (!this.options.cors?.enabled) {
            return null;
        }
        const corsOptions = {
            credentials: this.options.cors.credentials || false,
            methods: this.options.cors.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            allowedHeaders: this.options.cors.headers || ['Content-Type', 'Authorization', 'X-Sandbox-Session']
        };
        // Handle allowlist
        if (this.options.cors.allowlist && this.options.cors.allowlist.length > 0) {
            corsOptions.origin = (origin, callback) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin)
                    return callback(null, true);
                if (this.options.cors.allowlist.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'), false);
                }
            };
        }
        else {
            corsOptions.origin = false; // Disable CORS completely if no allowlist provided
        }
        return (0, cors_1.default)(corsOptions);
    }
    /**
     * Convert Express request to Sandbox request format
     */
    convertRequest(req) {
        // Parse cookies from request headers
        const cookies = {};
        if (req.headers.cookie) {
            req.headers.cookie.split(';').forEach(cookie => {
                const parts = cookie.trim().split('=');
                if (parts.length === 2) {
                    cookies[parts[0]] = parts[1];
                }
            });
        }
        // Extract query parameters
        const query = {};
        Object.entries(req.query).forEach(([key, value]) => {
            if (typeof value === 'string') {
                query[key] = value;
            }
            else if (Array.isArray(value) && value.length > 0) {
                query[key] = String(value[0]);
            }
            else if (value != null) {
                query[key] = String(value);
            }
        });
        // Convert headers to lowercase for consistency
        const headers = {};
        Object.entries(req.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                headers[key.toLowerCase()] = value;
            }
            else if (Array.isArray(value)) {
                headers[key.toLowerCase()] = value[0];
            }
            else if (value != null) {
                headers[key.toLowerCase()] = String(value);
            }
        });
        return {
            method: req.method,
            path: req.path,
            query,
            headers,
            cookies,
            body: req.body,
            pathParams: req.params || {},
            raw: req
        };
    }
    /**
     * Get the main middleware function
     */
    middleware() {
        return async (req, res, next) => {
            try {
                // Skip processing if path doesn't match basePath
                if (this.options.basePath && this.options.basePath !== '/' && !req.path.startsWith(this.options.basePath)) {
                    return next();
                }
                // Convert Express request to Sandbox format
                const sandboxReq = this.convertRequest(req);
                // Adjust path if basePath is set
                if (this.options.basePath && this.options.basePath !== '/') {
                    sandboxReq.path = sandboxReq.path.substring(this.options.basePath.length) || '/';
                }
                // Handle the request using sandbox
                await this.sandbox.handleRequest(sandboxReq.raw, res);
            }
            catch (error) {
                if (this.options.errorHandler) {
                    this.options.errorHandler(error, req, res, next);
                }
                else {
                    // Default error handling
                    if (this.options.enableLogging) {
                        console.error('Express adapter error:', { error, path: req.path, method: req.method });
                    }
                    if (!res.headersSent) {
                        res.status(500).json({
                            type: 'about:blank',
                            title: 'Internal Server Error',
                            status: 500,
                            detail: 'An unexpected error occurred',
                            instance: req.path
                        });
                    }
                }
            }
        };
    }
    /**
     * Get all middlewares (CORS + main) as an array
     */
    middlewares() {
        const middlewares = [];
        // Add CORS middleware if enabled
        const corsMiddleware = this.getCorsMiddleware();
        if (corsMiddleware) {
            middlewares.push(corsMiddleware);
        }
        // Add main middleware
        middlewares.push(this.middleware());
        return middlewares;
    }
    /**
     * Close the sandbox
     */
    async close() {
        await this.sandbox.close();
    }
}
exports.ExpressAdapter = ExpressAdapter;
/**
 * Create Express adapter with options
 */
async function createExpressAdapter(options) {
    const adapter = new ExpressAdapter(options);
    await adapter.initialize();
    return adapter;
}
/**
 * Create Express middleware function directly
 */
async function createExpressMiddleware(options) {
    const adapter = await createExpressAdapter(options);
    return adapter.middleware();
}
/**
 * Create multiple Express middlewares (CORS + main)
 */
async function createExpressMiddlewares(options) {
    const adapter = await createExpressAdapter(options);
    return adapter.middlewares();
}
//# sourceMappingURL=express.js.map