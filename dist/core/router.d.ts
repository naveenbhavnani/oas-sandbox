import { OpenAPILoader } from './loader';
import { RequestMatch, ResolvedOperation, ScenarioRule, SandboxRequest } from '../types';
export declare class Router {
    private loader;
    private scenarios;
    constructor(loader: OpenAPILoader);
    setScenarios(scenarios: ScenarioRule[]): void;
    match(method: string, path: string, query: Record<string, string>, headers: Record<string, string>): RequestMatch | null;
    private findMatchingScenarios;
    private scenarioMatches;
    private valueMatches;
    getOperations(): ResolvedOperation[];
    getOperation(operationId: string): ResolvedOperation | undefined;
    parseRequest(req: any): SandboxRequest;
    static parseAcceptHeader(acceptHeader?: string): string[];
    static negotiateContentType(accepts: string[], produces?: string[]): string;
}
//# sourceMappingURL=router.d.ts.map