import { TemplateAPI } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Deterministic subset of faker.js functionality
interface FakerAPI {
  name: {
    firstName(): string;
    lastName(): string;
    fullName(): string;
  };
  internet: {
    email(): string;
    userName(): string;
    url(): string;
  };
  address: {
    city(): string;
    country(): string;
    zipCode(): string;
    streetAddress(): string;
  };
  company: {
    name(): string;
  };
  commerce: {
    productName(): string;
    price(): string;
  };
  datatype: {
    number(options?: { min?: number; max?: number }): number;
    boolean(): boolean;
    uuid(): string;
  };
  date: {
    recent(): Date;
    future(): Date;
  };
}

interface TemplateContext {
  req: any;
  session: any;
  state: any;
  now: Date;
  uuid: () => string;
  rand: (min: number, max: number) => number;
  faker: FakerAPI;
  math: typeof Math;
  util: {
    json: {
      parse: (str: string) => any;
      stringify: (obj: any) => string;
    };
    string: {
      lower: (str: string) => string;
      upper: (str: string) => string;
      trim: (str: string) => string;
      replace: (str: string, search: string, replacement: string) => string;
    };
    array: {
      length: (arr: any[]) => number;
      join: (arr: any[], separator?: string) => string;
      slice: (arr: any[], start: number, end?: number) => any[];
    };
    object: {
      keys: (obj: any) => string[];
      values: (obj: any) => any[];
      entries: (obj: any) => [string, any][];
    };
  };
}

export class TemplateEngine implements TemplateAPI {
  private static readonly MAX_EXPRESSION_LENGTH = 1000;
  private static readonly MAX_EXECUTION_TIME = 100; // milliseconds
  private static readonly TEMPLATE_REGEX = /\{\{\s*((?:[^{}]|\{[^}]*\})*)\s*\}\}/g;

  private seedValue: string;
  private rng: () => number;

  constructor(seed?: string) {
    this.seedValue = seed || 'default-seed';
    this.rng = this.createSeededRng(this.seedValue);
  }

  private createSeededRng(seed: string): () => number {
    // Simple seeded PRNG based on mulberry32
    let a = this.hashString(seed);
    return () => {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private createFakerAPI(): FakerAPI {
    const names = [
      'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank',
      'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah'
    ];
    
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
      'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez'
    ];

    const cities = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
      'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville'
    ];

    const countries = [
      'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 
      'Japan', 'Australia', 'Brazil', 'India', 'China', 'Mexico', 'Italy'
    ];

    const companies = [
      'Tech Corp', 'Innovation Inc', 'Global Solutions', 'Future Systems',
      'Digital Dynamics', 'Smart Industries', 'NextGen Technologies', 'Alpha Beta'
    ];

    const products = [
      'Premium Widget', 'Smart Device', 'Digital Solution', 'Advanced Tool',
      'Professional Service', 'Quality Product', 'Innovative System', 'Elite Package'
    ];

    return {
      name: {
        firstName: () => this.randomChoice(names),
        lastName: () => this.randomChoice(lastNames),
        fullName: () => `${this.randomChoice(names)} ${this.randomChoice(lastNames)}`
      },
      internet: {
        email: () => {
          const firstName = this.randomChoice(names).toLowerCase();
          const lastName = this.randomChoice(lastNames).toLowerCase();
          const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
          return `${firstName}.${lastName}@${this.randomChoice(domains)}`;
        },
        userName: () => {
          const firstName = this.randomChoice(names).toLowerCase();
          const num = Math.floor(this.rng() * 1000);
          return `${firstName}${num}`;
        },
        url: () => {
          const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
          return `https://www.${this.randomChoice(domains)}`;
        }
      },
      address: {
        city: () => this.randomChoice(cities),
        country: () => this.randomChoice(countries),
        zipCode: () => {
          const num = Math.floor(this.rng() * 90000) + 10000;
          return num.toString();
        },
        streetAddress: () => {
          const streetNum = Math.floor(this.rng() * 9999) + 1;
          const streets = ['Main St', 'Oak Ave', 'First St', 'Second St', 'Park Rd', 'Elm St'];
          return `${streetNum} ${this.randomChoice(streets)}`;
        }
      },
      company: {
        name: () => this.randomChoice(companies)
      },
      commerce: {
        productName: () => this.randomChoice(products),
        price: () => {
          const price = (this.rng() * 999) + 1;
          return price.toFixed(2);
        }
      },
      datatype: {
        number: (options?: { min?: number; max?: number }) => {
          const min = options?.min ?? 0;
          const max = options?.max ?? 100;
          return Math.floor(this.rng() * (max - min + 1)) + min;
        },
        boolean: () => this.rng() > 0.5,
        uuid: () => uuidv4()
      },
      date: {
        recent: () => {
          const now = new Date();
          const daysBack = Math.floor(this.rng() * 30);
          return new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
        },
        future: () => {
          const now = new Date();
          const daysForward = Math.floor(this.rng() * 365);
          return new Date(now.getTime() + (daysForward * 24 * 60 * 60 * 1000));
        }
      }
    };
  }

  private randomChoice<T>(array: T[]): T {
    const index = Math.floor(this.rng() * array.length);
    return array[index];
  }

  private createContext(context: any): TemplateContext {
    // Create a fixed timestamp for deterministic behavior within a single render operation
    const fixedNow = new Date();
    
    return {
      req: context.req || {},
      session: context.session || {},
      state: context.state || {},
      now: fixedNow,
      uuid: () => uuidv4(),
      rand: (min: number, max: number) => {
        if (typeof min !== 'number' || typeof max !== 'number') {
          throw new Error('rand() requires two numeric arguments');
        }
        return Math.floor(this.rng() * (max - min + 1)) + min;
      },
      faker: this.createFakerAPI(),
      math: Math,
      util: {
        json: {
          parse: (str: string) => JSON.parse(str),
          stringify: (obj: any) => JSON.stringify(obj)
        },
        string: {
          lower: (str: string) => String(str).toLowerCase(),
          upper: (str: string) => String(str).toUpperCase(),
          trim: (str: string) => String(str).trim(),
          replace: (str: string, search: string, replacement: string) => 
            String(str).replace(search, replacement)
        },
        array: {
          length: (arr: any[]) => Array.isArray(arr) ? arr.length : 0,
          join: (arr: any[], separator = ',') => Array.isArray(arr) ? arr.join(separator) : '',
          slice: (arr: any[], start: number, end?: number) => 
            Array.isArray(arr) ? arr.slice(start, end) : []
        },
        object: {
          keys: (obj: any) => obj && typeof obj === 'object' ? Object.keys(obj) : [],
          values: (obj: any) => obj && typeof obj === 'object' ? Object.values(obj) : [],
          entries: (obj: any) => obj && typeof obj === 'object' ? Object.entries(obj) : []
        }
      }
    };
  }

  render(template: string, context: any): string {
    if (typeof template !== 'string') {
      return String(template);
    }

    const templateContext = this.createContext(context);
    
    return template.replace(TemplateEngine.TEMPLATE_REGEX, (match, expression) => {
      try {
        const result = this.evaluateWithContext(expression.trim(), templateContext);
        return result !== null && result !== undefined ? String(result) : '';
      } catch (error) {
        // Return the original template expression on error to avoid breaking output
        return match;
      }
    });
  }

  evaluate(expression: string, context: any): any {
    if (expression.length > TemplateEngine.MAX_EXPRESSION_LENGTH) {
      throw new Error(`Expression too long: ${expression.length} > ${TemplateEngine.MAX_EXPRESSION_LENGTH}`);
    }

    // Validate expression for dangerous patterns
    if (this.containsDangerousCode(expression)) {
      throw new Error('Expression contains potentially dangerous code');
    }

    const templateContext = this.createContext(context);
    return this.evaluateWithContext(expression, templateContext);
  }

  private evaluateWithContext(expression: string, templateContext: TemplateContext): any {
    const startTime = Date.now();

    try {
      // Create a safe evaluation environment
      const safeEval = this.createSafeEvaluator(templateContext);
      const result = safeEval(expression);

      // Check execution time
      if (Date.now() - startTime > TemplateEngine.MAX_EXECUTION_TIME) {
        throw new Error('Expression execution timeout');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Template evaluation error: ${errorMessage}`);
    }
  }

  private containsDangerousCode(expression: string): boolean {
    const dangerousPatterns = [
      /\bprocess\b/,
      /\bwindow\b/,
      /\bglobal\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\beval\b/,
      /\bFunction\b/,
      /\bconstructor\b/,
      /\b__proto__\b/,
      /\bprototype\b/,
      /\.\./,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bsetImmediate\b/,
      /\bBuffer\b/,
      /\bfs\b/,
      /\bpath\b/,
      /\bos\b/,
      /\bchild_process\b/,
      /\bcluster\b/,
      /\bdgram\b/,
      /\bdns\b/,
      /\bhttp\b/,
      /\bhttps\b/,
      /\bnet\b/,
      /\btls\b/,
      /\burl\b/,
      /\bquerystring\b/
    ];

    return dangerousPatterns.some(pattern => pattern.test(expression));
  }

  private createSafeEvaluator(context: TemplateContext): (expression: string) => any {
    return (expression: string) => {
      // Create sandbox with only safe variables (no reserved keywords as parameter names)
      const sandbox = {
        req: context.req,
        session: context.session,
        state: context.state,
        now: context.now,
        uuid: context.uuid,
        rand: context.rand,
        faker: context.faker,
        math: context.math,
        util: context.util,
        Math: Math,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Array: Array,
        Object: Object,
        Date: Date,
        RegExp: RegExp,
        JSON: JSON,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent
      };

      try {
        // Create function with sandboxed scope
        const keys = Object.keys(sandbox);
        const values = Object.values(sandbox);
        
        // Use Function constructor to create a safe evaluation context
        // Built-in literals (null, undefined, true, false, etc.) are handled by the JS engine
        const func = Function(...keys, `'use strict'; return (${expression})`);
        return func.apply(null, values);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid expression: ${expression} (${errorMessage})`);
      }
    };
  }

  processTemplate(obj: any, context: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Check if this node should be processed
    if (typeof obj === 'object' && obj.$template === true) {
      // Remove the $template flag and process this subtree
      const { $template, ...processObj } = obj;
      return this.deepProcess(processObj, context);
    }

    // If this object doesn't have $template: true, check if any nested objects do
    if (typeof obj === 'object' && Array.isArray(obj)) {
      return obj.map(item => this.processTemplate(item, context));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processTemplate(value, context);
      }
      return result;
    }

    // If not an object, return as-is
    return obj;
  }

  private deepProcess(obj: any, context: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.render(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepProcess(item, context));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Process both keys and values
        const processedKey = typeof key === 'string' ? this.render(key, context) : key;
        result[processedKey] = this.deepProcess(value, context);
      }
      return result;
    }

    return obj;
  }
}

export function createTemplateEngine(seed?: string): TemplateAPI {
  return new TemplateEngine(seed);
}