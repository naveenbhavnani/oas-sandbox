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
/**
 * Load configuration from file
 */
export declare function loadConfig(configPath?: string): Promise<ConfigFile | null>;
/**
 * Create a default configuration file
 */
export declare function createDefaultConfig(): ConfigFile;
/**
 * Merge multiple config objects with precedence
 */
export declare function mergeConfigs(...configs: (ConfigFile | null | undefined)[]): ConfigFile;
/**
 * Get configuration file search paths
 */
export declare function getConfigSearchPaths(): string[];
/**
 * Check if any configuration file exists
 */
export declare function hasConfigFile(): boolean;
//# sourceMappingURL=config.d.ts.map