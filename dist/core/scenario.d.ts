import { ScenarioRule, SandboxContext } from '../types';
import { TemplateEngine } from './template';
export declare class ScenarioEngine {
    private template;
    constructor(template: TemplateEngine);
    executeRule(rule: ScenarioRule, context: SandboxContext): Promise<void>;
    private executeAction;
    private handleRespond;
    private handleStateSet;
    private handleStatePatch;
    private handleStateIncrement;
    private handleStateDel;
    private handleDelay;
    private handleIf;
    private handleProxy;
    private handleEmit;
    private getDefaultStatus;
    private parseDelayString;
    private convertTimeUnit;
}
export declare function loadScenarios(source: string | ScenarioRule[]): Promise<ScenarioRule[]>;
//# sourceMappingURL=scenario.d.ts.map