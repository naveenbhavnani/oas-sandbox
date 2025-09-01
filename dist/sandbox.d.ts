import { IncomingMessage, ServerResponse } from 'http';
import { SandboxOptions } from './types';
export declare class Sandbox {
    private loader;
    private router;
    private scenarioEngine;
    private template;
    private validator;
    private dataGenerator;
    private store;
    private logger;
    private options;
    constructor(options: SandboxOptions);
    initialize(): Promise<void>;
    handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
    private createContext;
    private extractSessionId;
    private buildStateKey;
    private parseRequestBody;
    private generateDefaultResponse;
    private sendResponse;
    private sendErrorResponse;
    private handleUnmatched;
    close(): Promise<void>;
}
export declare function createSandbox(options: SandboxOptions): Promise<Sandbox>;
//# sourceMappingURL=sandbox.d.ts.map