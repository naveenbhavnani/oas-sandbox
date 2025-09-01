import { TemplateAPI } from '../types';
export declare class TemplateEngine implements TemplateAPI {
    private static readonly MAX_EXPRESSION_LENGTH;
    private static readonly MAX_EXECUTION_TIME;
    private static readonly TEMPLATE_REGEX;
    private seedValue;
    private rng;
    constructor(seed?: string);
    private createSeededRng;
    private hashString;
    private createFakerAPI;
    private randomChoice;
    private createContext;
    render(template: string, context: any): string;
    evaluate(expression: string, context: any): any;
    private evaluateWithContext;
    private containsDangerousCode;
    private createSafeEvaluator;
    processTemplate(obj: any, context: any): any;
    private deepProcess;
}
export declare function createTemplateEngine(seed?: string): TemplateAPI;
//# sourceMappingURL=template.d.ts.map