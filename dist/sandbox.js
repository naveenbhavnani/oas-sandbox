"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = void 0;
exports.createSandbox = createSandbox;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const loader_1 = require("./core/loader");
const router_1 = require("./core/router");
const scenario_1 = require("./core/scenario");
const template_1 = require("./core/template");
const validator_1 = require("./core/validator");
const data_generator_1 = require("./core/data-generator");
const stores_1 = require("./stores");
class Sandbox {
    loader;
    router;
    scenarioEngine;
    template;
    validator;
    dataGenerator;
    store;
    logger;
    options;
    constructor(options) {
        this.options = options;
        this.logger = options.logger || (0, pino_1.default)({ level: 'info', transport: { target: 'pino-pretty' } });
        // Initialize placeholder values - will be set in initialize()
        this.loader = new loader_1.OpenAPILoader();
        this.router = new router_1.Router(this.loader);
        this.template = new template_1.TemplateEngine();
        this.scenarioEngine = new scenario_1.ScenarioEngine(this.template);
        this.validator = null;
        this.dataGenerator = new data_generator_1.DataGenerator();
        this.store = {
            get: async () => null,
            set: async () => { },
            del: async () => { },
            increment: async () => 0,
            patch: async () => { },
            close: async () => { }
        };
    }
    async initialize() {
        try {
            // Load OpenAPI document
            this.loader = await (0, loader_1.loadOpenAPI)(this.options.oas);
            const document = this.loader.getDocument();
            // Initialize router
            this.router = new router_1.Router(this.loader);
            // Load scenarios if provided
            if (this.options.scenarios) {
                const scenarios = await (0, scenario_1.loadScenarios)(this.options.scenarios);
                this.router.setScenarios(scenarios);
            }
            // Initialize template engine
            this.template = new template_1.TemplateEngine(this.options.seed);
            // Initialize scenario engine
            this.scenarioEngine = new scenario_1.ScenarioEngine(this.template);
            // Initialize validator
            this.validator = (0, validator_1.createValidator)(document, {
                config: this.options.validate || { requests: true, responses: 'warn' },
                logger: this.logger
            });
            // Initialize data generator
            const generatorOptions = { document };
            if (this.options.seed) {
                generatorOptions.seed = this.options.seed;
            }
            this.dataGenerator = new data_generator_1.DataGenerator(generatorOptions);
            // Initialize state store
            if (this.options.store && 'get' in this.options.store) {
                // It's already a StateStore instance
                this.store = this.options.store;
            }
            else {
                // It's a StoreConfig, create the store
                this.store = await (0, stores_1.createStore)(this.options.store || { type: 'memory' });
            }
            this.logger.info('OAS Sandbox initialized successfully');
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to initialize sandbox');
            throw error;
        }
    }
    async handleRequest(req, res) {
        const requestId = (0, uuid_1.v4)();
        const startTime = Date.now();
        try {
            // Parse incoming request
            const sandboxReq = this.router.parseRequest(req);
            sandboxReq.body = await this.parseRequestBody(req);
            this.logger.info({ requestId, method: sandboxReq.method, path: sandboxReq.path }, 'Processing request');
            // Find matching operation and scenarios
            const match = this.router.match(sandboxReq.method, sandboxReq.path, sandboxReq.query, sandboxReq.headers);
            if (!match) {
                await this.handleUnmatched(sandboxReq, res, requestId);
                return;
            }
            // Extract path parameters
            sandboxReq.pathParams = match.params;
            // Validate request if enabled
            if (this.options.validate?.requests !== false) {
                const validationError = this.validator.validateRequest(match.operation, sandboxReq);
                if (validationError) {
                    await this.sendErrorResponse(res, 400, 'Bad Request', validationError, requestId);
                    return;
                }
            }
            // Create sandbox context
            const context = await this.createContext(sandboxReq, res, match, requestId);
            // Execute scenarios
            if (match.scenarios.length > 0) {
                for (const scenario of match.scenarios) {
                    await this.scenarioEngine.executeRule(scenario, context);
                }
            }
            else {
                // No scenarios - generate default response
                await this.generateDefaultResponse(context);
            }
            // Validate response if enabled
            if (this.options.validate?.responses) {
                const responseError = this.validator.validateResponse(match.operation, context.res);
                if (responseError) {
                    if (this.options.validate.responses === 'strict') {
                        await this.sendErrorResponse(res, 500, 'Internal Server Error', 'Response validation failed: ' + responseError, requestId);
                        return;
                    }
                    else {
                        this.logger.warn({ requestId, error: responseError }, 'Response validation failed');
                    }
                }
            }
            // Send response
            await this.sendResponse(res, context.res, requestId);
            const duration = Date.now() - startTime;
            this.logger.info({
                requestId,
                status: context.res.status,
                duration,
                operationId: match.operation.operationId
            }, 'Request completed');
        }
        catch (error) {
            this.logger.error({ requestId, error }, 'Error processing request');
            await this.sendErrorResponse(res, 500, 'Internal Server Error', 'Internal server error', requestId);
        }
    }
    async createContext(req, res, match, requestId) {
        // Determine session ID
        const sessionId = this.extractSessionId(req);
        // Create state API
        const stateAPI = {
            get: async (key, options) => {
                const fullKey = this.buildStateKey(key, sessionId, options?.scope || 'session');
                return this.store.get(fullKey);
            },
            set: async (key, value, options) => {
                const fullKey = this.buildStateKey(key, sessionId, options?.scope || 'session');
                await this.store.set(fullKey, value, options?.ttl);
            },
            patch: async (key, value, options) => {
                const fullKey = this.buildStateKey(key, sessionId, options?.scope || 'session');
                await this.store.patch(fullKey, value);
            },
            increment: async (key, by, options) => {
                const fullKey = this.buildStateKey(key, sessionId, options?.scope || 'session');
                return this.store.increment(fullKey, by || 1);
            },
            del: async (key, options) => {
                const fullKey = this.buildStateKey(key, sessionId, options?.scope || 'session');
                await this.store.del(fullKey);
            }
        };
        // Create schema API
        const schemaAPI = {
            validate: (schema, data) => this.validator.validate(schema, data),
            generate: (schema, options) => this.dataGenerator.generate(schema, options)
        };
        // Create template API
        const templateAPI = {
            render: (template, context) => this.template.render(template, context),
            evaluate: (expression, context) => this.template.evaluate(expression, context)
        };
        // Create session context
        const session = {
            id: sessionId,
            scope: sessionId === 'GLOBAL' ? 'global' : 'session'
        };
        // Create sandbox response
        const sandboxRes = {
            status: 200,
            headers: {},
            body: null,
            raw: res
        };
        return {
            req,
            res: sandboxRes,
            operation: match.operation,
            session,
            state: stateAPI,
            schema: schemaAPI,
            template: templateAPI,
            vars: {},
            logger: this.logger.child({ requestId, operationId: match.operation.operationId })
        };
    }
    extractSessionId(req) {
        // Resolution order per spec:
        // 1) Header X-Sandbox-Session
        // 2) Cookie sandbox_session  
        // 3) Authorization header raw string (opaque)
        // 4) Fallback: "GLOBAL"
        const sessionHeader = req.headers['x-sandbox-session'];
        if (sessionHeader) {
            return sessionHeader;
        }
        const sessionCookie = req.cookies['sandbox_session'];
        if (sessionCookie) {
            return sessionCookie;
        }
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            return authHeader;
        }
        return 'GLOBAL';
    }
    buildStateKey(key, sessionId, scope) {
        if (scope === 'global') {
            return `global:${key}`;
        }
        return `session:${sessionId}:${key}`;
    }
    async parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const contentType = req.headers['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        resolve(body ? JSON.parse(body) : null);
                    }
                    else {
                        resolve(body || null);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });
            req.on('error', reject);
        });
    }
    async generateDefaultResponse(context) {
        const operation = context.operation;
        const responses = operation.responses;
        // Find first 2xx response
        let statusCode = '200';
        let response = responses['200'];
        if (!response) {
            for (const [status, resp] of Object.entries(responses)) {
                const code = parseInt(status, 10);
                if (code >= 200 && code < 300) {
                    statusCode = status;
                    response = resp;
                    break;
                }
            }
        }
        context.res.status = parseInt(statusCode, 10);
        // Generate response body if schema is available
        if (response?.content) {
            const mediaType = response.content['application/json'];
            if (mediaType?.schema) {
                context.res.body = this.dataGenerator.generate(mediaType.schema);
                context.res.headers['content-type'] = 'application/json';
            }
        }
    }
    async sendResponse(res, sandboxRes, requestId) {
        res.statusCode = sandboxRes.status;
        // Set headers
        for (const [key, value] of Object.entries(sandboxRes.headers)) {
            res.setHeader(key, value);
        }
        // Set correlation ID
        res.setHeader('x-request-id', requestId);
        // Send body
        if (sandboxRes.body !== null && sandboxRes.body !== undefined) {
            if (typeof sandboxRes.body === 'object') {
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify(sandboxRes.body));
            }
            else {
                res.end(String(sandboxRes.body));
            }
        }
        else {
            res.end();
        }
    }
    async sendErrorResponse(res, status, title, detail, requestId) {
        const problemJson = {
            type: 'about:blank',
            title,
            status,
            detail,
            instance: requestId
        };
        res.statusCode = status;
        res.setHeader('content-type', 'application/problem+json');
        res.setHeader('x-request-id', requestId);
        res.end(JSON.stringify(problemJson));
    }
    async handleUnmatched(req, res, requestId) {
        // TODO: Implement proxy for unmatched routes if configured
        this.logger.warn({ requestId, method: req.method, path: req.path }, 'No matching operation found');
        await this.sendErrorResponse(res, 404, 'Not Found', 'No matching operation found', requestId);
    }
    async close() {
        if (this.store) {
            await this.store.close();
        }
    }
}
exports.Sandbox = Sandbox;
async function createSandbox(options) {
    const sandbox = new Sandbox(options);
    await sandbox.initialize();
    return sandbox;
}
//# sourceMappingURL=sandbox.js.map