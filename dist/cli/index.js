#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = require("fs");
const path_1 = require("path");
const yaml = __importStar(require("js-yaml"));
const pino_1 = __importDefault(require("pino"));
const sandbox_1 = require("../sandbox");
const loader_1 = require("../core/loader");
const data_generator_1 = require("../core/data-generator");
const server_adapter_1 = require("./server-adapter");
const config_1 = require("./config");
const program = new commander_1.Command();
// Load package.json for version
const packagePath = (0, path_1.resolve)(__dirname, '../../package.json');
const packageJson = JSON.parse((0, fs_1.readFileSync)(packagePath, 'utf8'));
program
    .name('oas-sandbox')
    .description('A stateful, spec-first OpenAPI mock server with scenarios, state management, and recording/replay capabilities')
    .version(packageJson.version);
program
    .command('serve')
    .description('Start the OpenAPI sandbox server')
    .argument('<openapi>', 'Path to OpenAPI document (YAML or JSON)')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .option('-h, --host <host>', 'Host to listen on', '0.0.0.0')
    .option('-s, --scenarios <path>', 'Path to scenarios directory or file')
    .option('--state <store>', 'State store configuration (memory, file://path, redis://url)')
    .option('--seed <seed>', 'Random seed for data generation')
    .option('--latency <latency>', 'Simulated latency (e.g., "100ms", "50±20ms")')
    .option('--error-rate <rate>', 'Error rate (0.0-1.0)', parseFloat)
    .option('--proxy <url>', 'Proxy unmatched requests to this URL')
    .option('--record <mode>', 'Recording mode for proxied requests', 'unmatched')
    .option('--redact <fields...>', 'Fields to redact from recorded responses')
    .option('--admin', 'Enable admin endpoints', false)
    .option('--no-validate-requests', 'Disable request validation')
    .option('--strict-responses', 'Enable strict response validation')
    .option('--log <level>', 'Log level', 'info')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (openapi, options) => {
    try {
        await handleServe(openapi, options);
    }
    catch (error) {
        console.error('Error starting server:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
program
    .command('inspect')
    .description('Analyze and inspect an OpenAPI document')
    .argument('<openapi>', 'Path to OpenAPI document (YAML or JSON)')
    .option('-f, --format <format>', 'Output format', 'table')
    .option('-o, --output <path>', 'Output file path')
    .action(async (openapi, options) => {
    try {
        await handleInspect(openapi, options);
    }
    catch (error) {
        console.error('Error inspecting document:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
program
    .command('gen')
    .description('Generate data from OpenAPI schemas')
    .option('--schema <jsonptr>', 'JSON Pointer to schema (required)', '')
    .option('--seed <seed>', 'Random seed for generation')
    .option('--count <count>', 'Number of items to generate', '1')
    .option('-f, --format <format>', 'Output format', 'json')
    .option('-o, --output <path>', 'Output file path')
    .action(async (options) => {
    try {
        if (!options.schema) {
            console.error('Error: --schema option is required');
            process.exit(1);
        }
        await handleGen(options);
    }
    catch (error) {
        console.error('Error generating data:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
async function handleServe(openapi, options) {
    const logger = createLogger(options.log || 'info');
    try {
        // Load configuration
        const config = await (0, config_1.loadConfig)(options.config);
        // Merge CLI options with config file
        const mergedOptions = mergeOptions(config, options);
        // Resolve OpenAPI document path
        const oasPath = (0, path_1.resolve)(openapi);
        if (!(0, fs_1.existsSync)(oasPath)) {
            throw new Error(`OpenAPI document not found: ${oasPath}`);
        }
        // Parse state store configuration
        const storeConfig = parseStoreConfig(mergedOptions.state);
        // Parse validation configuration
        const validateConfig = {
            requests: !mergedOptions.noValidateRequests,
            responses: mergedOptions.strictResponses ? 'strict' : 'warn'
        };
        // Create sandbox options
        const sandboxOptions = {
            oas: oasPath,
            store: storeConfig,
            validate: validateConfig,
            logger
        };
        if (mergedOptions.scenarios) {
            sandboxOptions.scenarios = mergedOptions.scenarios;
        }
        if (mergedOptions.seed) {
            sandboxOptions.seed = mergedOptions.seed;
        }
        // Add chaos configuration if specified
        if (mergedOptions.latency || mergedOptions.errorRate) {
            sandboxOptions.chaos = {};
            if (mergedOptions.latency) {
                sandboxOptions.chaos.latency = mergedOptions.latency;
            }
            if (mergedOptions.errorRate) {
                sandboxOptions.chaos.errorRate = mergedOptions.errorRate;
            }
        }
        // Add proxy configuration if specified
        if (mergedOptions.proxy) {
            sandboxOptions.proxy = {
                target: mergedOptions.proxy,
                record: mergedOptions.record || 'unmatched'
            };
            if (mergedOptions.redact) {
                sandboxOptions.proxy.redact = mergedOptions.redact;
            }
        }
        // Create and start the sandbox server
        const sandbox = await (0, sandbox_1.createSandbox)(sandboxOptions);
        const server = (0, server_adapter_1.createServerAdapter)(sandbox, {
            enableAdmin: mergedOptions.admin || false,
            logger
        });
        const port = parseInt(String(mergedOptions.port), 10);
        const host = mergedOptions.host || '0.0.0.0';
        await server.listen(port, host);
        logger.info(`🚀 OAS Sandbox server running at http://${host}:${port}`);
        logger.info(`📖 OpenAPI document: ${oasPath}`);
        if (mergedOptions.scenarios) {
            logger.info(`🎭 Scenarios: ${mergedOptions.scenarios}`);
        }
        if (mergedOptions.proxy) {
            logger.info(`🔄 Proxy: ${mergedOptions.proxy}`);
        }
        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down server...');
            await server.close();
            await sandbox.close();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            logger.info('Shutting down server...');
            await server.close();
            await sandbox.close();
            process.exit(0);
        });
    }
    catch (error) {
        logger.error(error, 'Failed to start server');
        throw error;
    }
}
async function handleInspect(openapi, options) {
    try {
        // Resolve OpenAPI document path
        const oasPath = (0, path_1.resolve)(openapi);
        if (!(0, fs_1.existsSync)(oasPath)) {
            throw new Error(`OpenAPI document not found: ${oasPath}`);
        }
        // Load OpenAPI document
        const loader = await (0, loader_1.loadOpenAPI)(oasPath);
        const document = loader.getDocument();
        const operationsMap = loader.getOperations();
        const operations = Array.from(operationsMap.values());
        // Analyze the document
        const analysis = {
            info: {
                title: document.info.title,
                version: document.info.version,
                description: document.info.description
            },
            servers: document.servers?.length || 0,
            paths: Object.keys(document.paths).length,
            operations: operations.length,
            operationsByMethod: operations.reduce((acc, op) => {
                acc[op.method] = (acc[op.method] || 0) + 1;
                return acc;
            }, {}),
            tags: document.tags?.map(tag => tag.name) || [],
            components: {
                schemas: Object.keys(document.components?.schemas || {}).length,
                responses: Object.keys(document.components?.responses || {}).length,
                parameters: Object.keys(document.components?.parameters || {}).length,
                securitySchemes: Object.keys(document.components?.securitySchemes || {}).length
            },
            operationsList: operations.map((op) => ({
                operationId: op.operationId,
                method: op.method.toUpperCase(),
                path: op.path,
                summary: op.operation.summary,
                tags: op.operation.tags || []
            }))
        };
        // Format output
        let output;
        switch (options.format) {
            case 'json':
                output = JSON.stringify(analysis, null, 2);
                break;
            case 'yaml':
                output = yaml.dump(analysis);
                break;
            case 'table':
            default:
                output = formatAnalysisAsTable(analysis);
                break;
        }
        // Write to file or stdout
        if (options.output) {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.writeFile((0, path_1.resolve)(options.output), output);
            console.log(`Analysis written to ${options.output}`);
        }
        else {
            console.log(output);
        }
    }
    catch (error) {
        throw new Error(`Failed to inspect document: ${error instanceof Error ? error.message : error}`);
    }
}
async function handleGen(options) {
    try {
        // For gen command, we need a way to specify the OpenAPI document
        // Let's check for a config file or require it as an environment variable
        const config = await (0, config_1.loadConfig)();
        let oasPath;
        if (config?.openapi) {
            oasPath = (0, path_1.resolve)(config.openapi);
        }
        else if (process.env.OAS_DOCUMENT) {
            oasPath = (0, path_1.resolve)(process.env.OAS_DOCUMENT);
        }
        else {
            throw new Error('OpenAPI document path required. Set OAS_DOCUMENT environment variable or specify in .sandboxrc config file.');
        }
        if (!(0, fs_1.existsSync)(oasPath)) {
            throw new Error(`OpenAPI document not found: ${oasPath}`);
        }
        // Load OpenAPI document
        const loader = await (0, loader_1.loadOpenAPI)(oasPath);
        const document = loader.getDocument();
        // Create data generator  
        const generatorOptions = { document };
        if (options.seed) {
            generatorOptions.seed = options.seed;
        }
        const generator = new data_generator_1.DataGenerator(generatorOptions);
        // Parse JSON pointer to get schema
        const schemaPointer = options.schema;
        const schema = resolveSchemaPointer(document, schemaPointer);
        if (!schema) {
            throw new Error(`Schema not found at pointer: ${schemaPointer}`);
        }
        // Generate data
        const count = parseInt(String(options.count || '1'), 10);
        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(generator.generate(schema));
        }
        // Format output
        let output;
        const data = results.length === 1 ? results[0] : results;
        switch (options.format) {
            case 'yaml':
                output = yaml.dump(data);
                break;
            case 'json':
            default:
                output = JSON.stringify(data, null, 2);
                break;
        }
        // Write to file or stdout
        if (options.output) {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.writeFile((0, path_1.resolve)(options.output), output);
            console.log(`Generated data written to ${options.output}`);
        }
        else {
            console.log(output);
        }
    }
    catch (error) {
        throw new Error(`Failed to generate data: ${error instanceof Error ? error.message : error}`);
    }
}
function createLogger(level) {
    return (0, pino_1.default)({
        level,
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'yyyy-mm-dd HH:MM:ss'
            }
        }
    });
}
function parseStoreConfig(state) {
    if (!state || state === 'memory') {
        return { type: 'memory' };
    }
    if (state.startsWith('file://')) {
        const path = state.replace('file://', '');
        return {
            type: 'file',
            options: { path: (0, path_1.resolve)(path) }
        };
    }
    if (state.startsWith('redis://')) {
        return {
            type: 'redis',
            options: { url: state }
        };
    }
    throw new Error(`Invalid state store configuration: ${state}`);
}
function mergeOptions(config, options) {
    if (!config)
        return options;
    const merged = { ...options };
    if (merged.port === undefined && config.port !== undefined)
        merged.port = config.port;
    if (merged.host === undefined && config.host !== undefined)
        merged.host = config.host;
    if (merged.scenarios === undefined && config.scenarios !== undefined)
        merged.scenarios = config.scenarios;
    if (merged.state === undefined && config.state !== undefined)
        merged.state = config.state;
    if (merged.seed === undefined && config.seed !== undefined)
        merged.seed = config.seed;
    if (merged.latency === undefined && config.latency !== undefined)
        merged.latency = config.latency;
    if (merged.errorRate === undefined && config.errorRate !== undefined)
        merged.errorRate = config.errorRate;
    if (merged.proxy === undefined && config.proxy !== undefined)
        merged.proxy = config.proxy;
    if (merged.record === undefined && config.record !== undefined)
        merged.record = config.record;
    if (merged.redact === undefined && config.redact !== undefined)
        merged.redact = config.redact;
    if (merged.admin === undefined && config.admin !== undefined)
        merged.admin = config.admin;
    if (merged.noValidateRequests === undefined && config.validateRequests !== undefined) {
        merged.noValidateRequests = !config.validateRequests;
    }
    if (merged.strictResponses === undefined && config.strictResponses !== undefined) {
        merged.strictResponses = config.strictResponses;
    }
    if (merged.log === undefined && config.logLevel !== undefined)
        merged.log = config.logLevel;
    return merged;
}
function formatAnalysisAsTable(analysis) {
    const lines = [];
    lines.push('📋 OpenAPI Document Analysis');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Title: ${analysis.info.title}`);
    lines.push(`Version: ${analysis.info.version}`);
    if (analysis.info.description) {
        lines.push(`Description: ${analysis.info.description}`);
    }
    lines.push('');
    lines.push('📊 Statistics:');
    lines.push(`  Paths: ${analysis.paths}`);
    lines.push(`  Operations: ${analysis.operations}`);
    lines.push(`  Servers: ${analysis.servers}`);
    if (analysis.tags.length > 0) {
        lines.push(`  Tags: ${analysis.tags.join(', ')}`);
    }
    lines.push('');
    lines.push('🔧 Components:');
    lines.push(`  Schemas: ${analysis.components.schemas}`);
    lines.push(`  Responses: ${analysis.components.responses}`);
    lines.push(`  Parameters: ${analysis.components.parameters}`);
    lines.push(`  Security Schemes: ${analysis.components.securitySchemes}`);
    lines.push('');
    lines.push('📡 Operations by Method:');
    for (const [method, count] of Object.entries(analysis.operationsByMethod)) {
        lines.push(`  ${method.toUpperCase()}: ${count}`);
    }
    lines.push('');
    lines.push('🛠️ Available Operations:');
    for (const op of analysis.operationsList) {
        const tags = op.tags.length > 0 ? ` [${op.tags.join(', ')}]` : '';
        lines.push(`  ${op.method} ${op.path} - ${op.operationId}${tags}`);
        if (op.summary) {
            lines.push(`    ${op.summary}`);
        }
    }
    return lines.join('\n');
}
function resolveSchemaPointer(document, pointer) {
    const parts = pointer.split('/').filter(part => part !== '' && part !== '#');
    let current = document;
    for (const part of parts) {
        if (current[part] === undefined) {
            return null;
        }
        current = current[part];
    }
    return current;
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Parse command line arguments
program.parse();
//# sourceMappingURL=index.js.map