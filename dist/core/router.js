"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
const url_1 = require("url");
class Router {
    loader;
    scenarios = [];
    constructor(loader) {
        this.loader = loader;
    }
    setScenarios(scenarios) {
        this.scenarios = [...scenarios].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    match(method, path, query, headers) {
        // Find matching operations
        const operations = this.loader.findOperationsByPath(method, path);
        if (operations.length === 0) {
            return null;
        }
        // Use the most specific operation (first in sorted list)
        const operation = operations[0];
        const params = this.loader.extractPathParams(operation, path);
        // Find matching scenarios for this operation
        const matchingScenarios = this.findMatchingScenarios(operation, { query, headers });
        return {
            operation,
            params,
            scenarios: matchingScenarios
        };
    }
    findMatchingScenarios(operation, requestContext) {
        const matchingScenarios = [];
        for (const scenario of this.scenarios) {
            if (this.scenarioMatches(scenario, operation, requestContext)) {
                matchingScenarios.push(scenario);
            }
        }
        return matchingScenarios;
    }
    scenarioMatches(scenario, operation, requestContext) {
        const { when } = scenario;
        let matches = false;
        // Check operation matching
        if (when.operationId) {
            matches = when.operationId === operation.operationId;
        }
        else if (when.method && when.path) {
            matches = when.method.toUpperCase() === operation.method && when.path === operation.path;
        }
        else {
            return false; // Invalid selector
        }
        if (!matches) {
            return false;
        }
        // Check additional match conditions
        if (when.match) {
            // Check query parameters
            if (when.match.query) {
                for (const [key, expectedValue] of Object.entries(when.match.query)) {
                    const actualValue = requestContext.query[key];
                    if (!this.valueMatches(actualValue, expectedValue)) {
                        matches = false;
                        break;
                    }
                }
            }
            // Check headers
            if (when.match.headers && matches) {
                for (const [key, expectedValue] of Object.entries(when.match.headers)) {
                    const actualValue = requestContext.headers[key.toLowerCase()];
                    if (!this.valueMatches(actualValue, expectedValue)) {
                        matches = false;
                        break;
                    }
                }
            }
        }
        // Apply negation if specified
        if (when.negate) {
            matches = !matches;
        }
        return matches;
    }
    valueMatches(actual, expected) {
        if (actual === undefined) {
            return false;
        }
        // Check for regex pattern (assumes $regex: pattern format)
        if (expected.startsWith('$regex:')) {
            const pattern = expected.substring(7).trim();
            try {
                const regex = new RegExp(pattern);
                return regex.test(actual);
            }
            catch {
                return false; // Invalid regex
            }
        }
        // Exact match
        return actual === expected;
    }
    getOperations() {
        return Array.from(this.loader.getOperations().values());
    }
    getOperation(operationId) {
        return this.loader.getOperation(operationId);
    }
    parseRequest(req) {
        // Parse URL for query parameters
        const url = new url_1.URL(req.url || '', 'http://localhost');
        const query = {};
        for (const [key, value] of url.searchParams.entries()) {
            query[key] = value;
        }
        // Normalize headers to lowercase
        const headers = {};
        for (const [key, value] of Object.entries(req.headers || {})) {
            headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
        }
        // Parse cookies from Cookie header
        const cookies = {};
        const cookieHeader = headers['cookie'];
        if (cookieHeader) {
            const cookiePairs = cookieHeader.split(';').map(c => c.trim());
            for (const pair of cookiePairs) {
                const [name, ...valueParts] = pair.split('=');
                if (name && valueParts.length > 0) {
                    cookies[name.trim()] = valueParts.join('=').trim();
                }
            }
        }
        return {
            method: (req.method || 'GET').toUpperCase(),
            path: url.pathname,
            query,
            headers,
            cookies,
            body: req.body,
            pathParams: {}, // Will be filled by the matched operation
            raw: req
        };
    }
    static parseAcceptHeader(acceptHeader) {
        if (!acceptHeader) {
            return ['*/*'];
        }
        return acceptHeader
            .split(',')
            .map(type => type.trim().split(';')[0]) // Remove quality factors
            .filter(Boolean);
    }
    static negotiateContentType(accepts, produces = ['application/json']) {
        // Check for exact matches
        for (const accept of accepts) {
            if (produces.includes(accept)) {
                return accept;
            }
        }
        // Check for wildcard matches
        for (const accept of accepts) {
            if (accept === '*/*') {
                return produces[0] || 'application/json';
            }
            if (accept.endsWith('/*')) {
                const prefix = accept.substring(0, accept.length - 2);
                for (const produce of produces) {
                    if (produce.startsWith(prefix)) {
                        return produce;
                    }
                }
            }
        }
        // Default fallback
        return produces[0] || 'application/json';
    }
}
exports.Router = Router;
//# sourceMappingURL=router.js.map