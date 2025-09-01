import { Logger } from 'pino';
import { Sandbox } from '../sandbox';
export interface ServerAdapterOptions {
    enableAdmin?: boolean;
    logger?: Logger;
}
export interface SandboxServer {
    listen(port: number, host?: string): Promise<void>;
    close(): Promise<void>;
}
/**
 * Create a server adapter that wraps the Sandbox class
 */
export declare function createServerAdapter(sandbox: Sandbox, options?: ServerAdapterOptions): SandboxServer;
//# sourceMappingURL=server-adapter.d.ts.map