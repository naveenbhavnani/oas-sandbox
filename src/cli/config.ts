import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';

export interface ConfigFile {
  openapi?: string;
  port?: number;
  host?: string;
  scenarios?: string;
  state?: string;
  seed?: string;
  latency?: string;
  errorRate?: number;
  proxy?: string;
  record?: 'always' | 'unmatched' | 'never';
  redact?: string[];
  admin?: boolean;
  validateRequests?: boolean;
  strictResponses?: boolean;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
}

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
export async function loadConfig(configPath?: string): Promise<ConfigFile | null> {
  let configFile: string | null = null;
  
  if (configPath) {
    // Explicit config file path provided
    configFile = resolve(configPath);
    if (!existsSync(configFile)) {
      throw new Error(`Configuration file not found: ${configFile}`);
    }
  } else {
    // Search for config files in current directory
    for (const filename of CONFIG_FILENAMES) {
      const path = resolve(process.cwd(), filename);
      if (existsSync(path)) {
        configFile = path;
        break;
      }
    }
  }
  
  if (!configFile) {
    return null;
  }
  
  try {
    const content = readFileSync(configFile, 'utf8');
    let config: ConfigFile;
    
    if (configFile.endsWith('.json')) {
      config = JSON.parse(content);
    } else if (configFile.endsWith('.yaml') || configFile.endsWith('.yml')) {
      config = yaml.load(content) as ConfigFile;
    } else {
      // Try to parse as JSON first, then YAML
      try {
        config = JSON.parse(content);
      } catch {
        config = yaml.load(content) as ConfigFile;
      }
    }
    
    // Validate configuration
    validateConfig(config);
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration from ${configFile}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Validate configuration object
 */
function validateConfig(config: ConfigFile): void {
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
    if (config[field as keyof ConfigFile] !== undefined && typeof config[field as keyof ConfigFile] !== 'boolean') {
      throw new Error(`${field} must be a boolean`);
    }
  }
}

/**
 * Create a default configuration file
 */
export function createDefaultConfig(): ConfigFile {
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
export function mergeConfigs(...configs: (ConfigFile | null | undefined)[]): ConfigFile {
  const result: ConfigFile = {};
  
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
export function getConfigSearchPaths(): string[] {
  return CONFIG_FILENAMES.map(filename => resolve(process.cwd(), filename));
}

/**
 * Check if any configuration file exists
 */
export function hasConfigFile(): boolean {
  return CONFIG_FILENAMES.some(filename => 
    existsSync(resolve(process.cwd(), filename))
  );
}