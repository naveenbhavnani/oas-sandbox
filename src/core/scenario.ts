import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { 
  ScenarioRule, 
  ScenarioAction, 
  SandboxContext, 
  RespondAction, 
  StateSetAction, 
  StatePatchAction, 
  StateIncrementAction, 
  StateDelAction,
  DelayAction,
  IfAction,
  ProxyAction,
  EmitAction
} from '../types';
import { TemplateEngine } from './template';

export class ScenarioEngine {
  private template: TemplateEngine;

  constructor(template: TemplateEngine) {
    this.template = template;
  }

  async executeRule(rule: ScenarioRule, context: SandboxContext): Promise<void> {
    for (const action of rule.do) {
      await this.executeAction(action, context);
    }
  }

  private async executeAction(action: ScenarioAction, context: SandboxContext): Promise<void> {
    try {
      if ('respond' in action) {
        await this.handleRespond(action, context);
      } else if ('state.set' in action) {
        await this.handleStateSet(action, context);
      } else if ('state.patch' in action) {
        await this.handleStatePatch(action, context);
      } else if ('state.increment' in action) {
        await this.handleStateIncrement(action, context);
      } else if ('state.del' in action) {
        await this.handleStateDel(action, context);
      } else if ('delay' in action) {
        await this.handleDelay(action, context);
      } else if ('if' in action) {
        await this.handleIf(action, context);
      } else if ('proxy' in action) {
        await this.handleProxy(action, context);
      } else if ('emit' in action) {
        await this.handleEmit(action, context);
      }
    } catch (error) {
      context.logger.error({ error, action }, 'Error executing scenario action');
      throw error;
    }
  }

  private async handleRespond(action: RespondAction, context: SandboxContext): Promise<void> {
    const respond = action.respond;
    
    // Determine status code
    const status = respond.status || this.getDefaultStatus(context);
    
    // Process headers
    const headers: Record<string, string> = {};
    if (respond.headers) {
      for (const [key, value] of Object.entries(respond.headers)) {
        headers[key] = typeof value === 'string' ? 
          this.template.render(value, context) : 
          String(value);
      }
    }

    // Process body
    let body = respond.body;
    if (body && respond.$template) {
      body = this.template.processTemplate(body, context);
    }

    // Apply schema validation and generation if specified
    if (respond.$schema && context.schema) {
      const schemaRef = respond.$schema;
      if (body) {
        const validation = context.schema.validate(schemaRef as any, body);
        if (!validation.valid) {
          context.logger.warn({ errors: validation.errors, body }, 'Response body validation failed');
        }
      } else {
        // Generate body from schema
        body = context.schema.generate(schemaRef as any);
      }
    }

    // Set response
    context.res.status = status;
    context.res.headers = { ...context.res.headers, ...headers };
    context.res.body = body;
  }

  private async handleStateSet(action: StateSetAction, context: SandboxContext): Promise<void> {
    const { key, value, ttl, scope = 'session' } = action['state.set'];
    
    const processedKey = this.template.render(key, context);
    const processedValue = this.template.processTemplate(value, context);
    
    await context.state.set(processedKey, processedValue, { 
      ...(ttl !== undefined && { ttl }), 
      scope 
    });
  }

  private async handleStatePatch(action: StatePatchAction, context: SandboxContext): Promise<void> {
    const { key, value, scope = 'session' } = action['state.patch'];
    
    const processedKey = this.template.render(key, context);
    const processedValue = this.template.processTemplate(value, context);
    
    await context.state.patch(processedKey, processedValue, { scope });
  }

  private async handleStateIncrement(action: StateIncrementAction, context: SandboxContext): Promise<void> {
    const { key, by = 1, as, scope = 'session' } = action['state.increment'];
    
    const processedKey = this.template.render(key, context);
    const result = await context.state.increment(processedKey, by, { scope });
    
    if (as) {
      context.vars[as] = result;
    }
  }

  private async handleStateDel(action: StateDelAction, context: SandboxContext): Promise<void> {
    const { key, scope = 'session' } = action['state.del'];
    
    const processedKey = this.template.render(key, context);
    await context.state.del(processedKey, { scope });
  }

  private async handleDelay(action: DelayAction, _context: SandboxContext): Promise<void> {
    const delay = action.delay;
    let milliseconds: number;

    if (typeof delay === 'number') {
      milliseconds = delay;
    } else {
      milliseconds = this.parseDelayString(delay);
    }

    // Add some jitter if specified in distribution format
    if (typeof delay === 'string' && delay.includes('±')) {
      const [mean, jitter] = delay.split('±').map(part => 
        parseInt(part.replace(/[^\d]/g, ''), 10)
      );
      
      if (!isNaN(mean) && !isNaN(jitter)) {
        const randomJitter = (Math.random() - 0.5) * 2 * jitter;
        milliseconds = mean + randomJitter;
      }
    }

    milliseconds = Math.max(0, milliseconds);
    
    if (milliseconds > 0) {
      await new Promise(resolve => setTimeout(resolve, milliseconds));
    }
  }

  private async handleIf(action: IfAction, context: SandboxContext): Promise<void> {
    const { when, then, else: elseActions } = action.if;
    
    const condition = this.template.evaluate(when, context);
    const actions = condition ? then : (elseActions || []);
    
    for (const subAction of actions) {
      await this.executeAction(subAction, context);
    }
  }

  private async handleProxy(_action: ProxyAction, context: SandboxContext): Promise<void> {
    // Proxy functionality would be implemented here
    // This is a placeholder for the full proxy implementation
    context.logger.info('Proxy action not yet implemented');
  }

  private async handleEmit(action: EmitAction, context: SandboxContext): Promise<void> {
    const { level, message } = action.emit;
    const processedMessage = this.template.render(message, context);
    
    context.logger[level](processedMessage);
  }

  private getDefaultStatus(context: SandboxContext): number {
    const responses = context.operation.responses;
    
    // Find first 2xx response
    for (const [status] of Object.entries(responses)) {
      const statusCode = parseInt(status, 10);
      if (statusCode >= 200 && statusCode < 300) {
        return statusCode;
      }
    }
    
    return 200; // Default fallback
  }

  private parseDelayString(delayStr: string): number {
    // Handle formats like "150ms", "2s", "150±50ms", "p95=300ms"
    
    if (delayStr.includes('p95=')) {
      // Percentile format: "p95=300ms" - use the specified value
      const match = delayStr.match(/p95=(\d+)(\w+)?/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2] || 'ms';
        return this.convertTimeUnit(value, unit);
      }
    }
    
    if (delayStr.includes('±')) {
      // Distribution format: "150±50ms" - use mean value
      const [meanStr] = delayStr.split('±');
      const match = meanStr.match(/(\d+)(\w+)?/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2] || 'ms';
        return this.convertTimeUnit(value, unit);
      }
    }
    
    // Simple format: "150ms", "2s"
    const match = delayStr.match(/(\d+)(\w+)?/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2] || 'ms';
      return this.convertTimeUnit(value, unit);
    }
    
    return 0;
  }

  private convertTimeUnit(value: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      default:
        return value; // Assume milliseconds
    }
  }
}

export async function loadScenarios(source: string | ScenarioRule[]): Promise<ScenarioRule[]> {
  if (Array.isArray(source)) {
    return source;
  }

  const content = await fs.readFile(source, 'utf-8');
  const data = yaml.load(content) as { scenarios: ScenarioRule[] };
  
  if (!data.scenarios || !Array.isArray(data.scenarios)) {
    throw new Error('Invalid scenario file format. Expected { scenarios: [...] }');
  }

  // Validate and normalize scenarios
  return data.scenarios.map((scenario, index) => {
    if (!scenario.when) {
      throw new Error(`Scenario at index ${index} is missing 'when' selector`);
    }
    
    if (!scenario.do || !Array.isArray(scenario.do)) {
      throw new Error(`Scenario at index ${index} is missing 'do' actions array`);
    }

    return {
      ...scenario,
      priority: scenario.priority || 0
    };
  });
}