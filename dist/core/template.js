"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngine = void 0;
exports.createTemplateEngine = createTemplateEngine;
const uuid_1 = require("uuid");
class TemplateEngine {
    static MAX_EXPRESSION_LENGTH = 1000;
    static MAX_EXECUTION_TIME = 100; // milliseconds
    static TEMPLATE_REGEX = /\{\{\s*((?:[^{}]|\{[^}]*\})*)\s*\}\}/g;
    seedValue;
    rng;
    constructor(seed) {
        this.seedValue = seed || 'default-seed';
        this.rng = this.createSeededRng(this.seedValue);
    }
    createSeededRng(seed) {
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
    hashString(str) {
        let hash = 0;
        if (str.length === 0)
            return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    createFakerAPI() {
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
                number: (options) => {
                    const min = options?.min ?? 0;
                    const max = options?.max ?? 100;
                    return Math.floor(this.rng() * (max - min + 1)) + min;
                },
                boolean: () => this.rng() > 0.5,
                uuid: () => (0, uuid_1.v4)()
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
    randomChoice(array) {
        const index = Math.floor(this.rng() * array.length);
        return array[index];
    }
    createContext(context) {
        // Create a fixed timestamp for deterministic behavior within a single render operation
        const fixedNow = new Date();
        return {
            req: context.req || {},
            session: context.session || {},
            state: context.state || {},
            now: fixedNow,
            uuid: () => (0, uuid_1.v4)(),
            rand: (min, max) => {
                if (typeof min !== 'number' || typeof max !== 'number') {
                    throw new Error('rand() requires two numeric arguments');
                }
                return Math.floor(this.rng() * (max - min + 1)) + min;
            },
            faker: this.createFakerAPI(),
            math: Math,
            util: {
                json: {
                    parse: (str) => JSON.parse(str),
                    stringify: (obj) => JSON.stringify(obj)
                },
                string: {
                    lower: (str) => String(str).toLowerCase(),
                    upper: (str) => String(str).toUpperCase(),
                    trim: (str) => String(str).trim(),
                    replace: (str, search, replacement) => String(str).replace(search, replacement)
                },
                array: {
                    length: (arr) => Array.isArray(arr) ? arr.length : 0,
                    join: (arr, separator = ',') => Array.isArray(arr) ? arr.join(separator) : '',
                    slice: (arr, start, end) => Array.isArray(arr) ? arr.slice(start, end) : []
                },
                object: {
                    keys: (obj) => obj && typeof obj === 'object' ? Object.keys(obj) : [],
                    values: (obj) => obj && typeof obj === 'object' ? Object.values(obj) : [],
                    entries: (obj) => obj && typeof obj === 'object' ? Object.entries(obj) : []
                }
            }
        };
    }
    render(template, context) {
        if (typeof template !== 'string') {
            return String(template);
        }
        const templateContext = this.createContext(context);
        return template.replace(TemplateEngine.TEMPLATE_REGEX, (match, expression) => {
            try {
                const result = this.evaluateWithContext(expression.trim(), templateContext);
                return result !== null && result !== undefined ? String(result) : '';
            }
            catch (error) {
                // Return the original template expression on error to avoid breaking output
                return match;
            }
        });
    }
    evaluate(expression, context) {
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
    evaluateWithContext(expression, templateContext) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Template evaluation error: ${errorMessage}`);
        }
    }
    containsDangerousCode(expression) {
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
    createSafeEvaluator(context) {
        return (expression) => {
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
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Invalid expression: ${expression} (${errorMessage})`);
            }
        };
    }
    processTemplate(obj, context) {
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
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.processTemplate(value, context);
            }
            return result;
        }
        // If not an object, return as-is
        return obj;
    }
    deepProcess(obj, context) {
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
            const result = {};
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
exports.TemplateEngine = TemplateEngine;
function createTemplateEngine(seed) {
    return new TemplateEngine(seed);
}
//# sourceMappingURL=template.js.map