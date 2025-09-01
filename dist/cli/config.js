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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.createDefaultConfig = createDefaultConfig;
exports.mergeConfigs = mergeConfigs;
exports.getConfigSearchPaths = getConfigSearchPaths;
exports.hasConfigFile = hasConfigFile;
const fs_1 = require("fs");
const path_1 = require("path");
const yaml = __importStar(require("js-yaml"));
const CONFIG_FILENAMES = [
    '.sandboxrc.json',
    '.sandboxrc.yaml',
    '.sandboxrc.yml',
    'sandbox.config.json',
    'sandbox.config.yaml',
    'sandbox.config.yml'
];
/**
 * Load configuration from file
 */
async function loadConfig(configPath) {
    let configFile = null;
    if (configPath) {
        // Explicit config file path provided
        configFile = (0, path_1.resolve)(configPath);
        if (!(0, fs_1.existsSync)(configFile)) {
            throw new Error(`Configuration file not found: ${configFile}`);
        }
    }
    else {
        // Search for config files in current directory
        for (const filename of CONFIG_FILENAMES) {
            const path = (0, path_1.resolve)(process.cwd(), filename);
            if ((0, fs_1.existsSync)(path)) {
                configFile = path;
                break;
            }
        }
    }
    if (!configFile) {
        return null;
    }
    try {
        const content = (0, fs_1.readFileSync)(configFile, 'utf8');
        let config;
        if (configFile.endsWith('.json')) {
            config = JSON.parse(content);
        }
        else if (configFile.endsWith('.yaml') || configFile.endsWith('.yml')) {
            config = yaml.load(content);
        }
        else {
            // Try to parse as JSON first, then YAML
            try {
                config = JSON.parse(content);
            }
            catch {
                config = yaml.load(content);
            }
        }
        // Validate configuration
        validateConfig(config);
        return config;
    }
    catch (error) {
        throw new Error(`Failed to load configuration from ${configFile}: ${error instanceof Error ? error.message : error}`);
    }
}
/**
 * Validate configuration object
 */
function validateConfig(config) {
    // Validate port
    if (config.port !== undefined) {
        if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
            throw new Error('Port must be a number between 1 and 65535');
        }
    }
    // Validate host
    if (config.host !== undefined && typeof config.host !== 'string') {
        throw new Error('Host must be a string');
    }
    // Validate error rate
    if (config.errorRate !== undefined) {
        if (typeof config.errorRate !== 'number' || config.errorRate < 0 || config.errorRate > 1) {
            throw new Error('Error rate must be a number between 0 and 1');
        }
    }
    // Validate record mode
    if (config.record !== undefined) {
        const validModes = ['always', 'unmatched', 'never'];
        if (!validModes.includes(config.record)) {
            throw new Error(`Record mode must be one of: ${validModes.join(', ')}`);
        }
    }
    // Validate log level
    if (config.logLevel !== undefined) {
        const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
        if (!validLevels.includes(config.logLevel)) {
            throw new Error(`Log level must be one of: ${validLevels.join(', ')}`);
        }
    }
    // Validate redact array
    if (config.redact !== undefined) {
        if (!Array.isArray(config.redact) || !config.redact.every(item => typeof item === 'string')) {
            throw new Error('Redact must be an array of strings');
        }
    }
    // Validate boolean fields
    const booleanFields = ['admin', 'validateRequests', 'strictResponses'];
    for (const field of booleanFields) {
        if (config[field] !== undefined && typeof config[field] !== 'boolean') {
            throw new Error(`${field} must be a boolean`);
        }
    }
}
/**
 * Create a default configuration file
 */
function createDefaultConfig() {
    return {
        port: 3000,
        host: '0.0.0.0',
        validateRequests: true,
        strictResponses: false,
        admin: false,
        logLevel: 'info',
        record: 'unmatched'
    };
}
/**
 * Merge multiple config objects with precedence
 */
function mergeConfigs(...configs) {
    const result = {};
    for (const config of configs) {
        if (config) {
            Object.assign(result, config);
        }
    }
    return result;
}
/**
 * Get configuration file search paths
 */
function getConfigSearchPaths() {
    return CONFIG_FILENAMES.map(filename => (0, path_1.resolve)(process.cwd(), filename));
}
/**
 * Check if any configuration file exists
 */
function hasConfigFile() {
    return CONFIG_FILENAMES.some(filename => (0, fs_1.existsSync)((0, path_1.resolve)(process.cwd(), filename)));
}
//# sourceMappingURL=config.js.map