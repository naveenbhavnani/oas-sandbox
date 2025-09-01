"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerAdapter = createServerAdapter;
const http_1 = require("http");
/**
 * Create a server adapter that wraps the Sandbox class
 */
function createServerAdapter(sandbox, options = {}) {
    const logger = options.logger;
    let server = null;
    return {
        async listen(port, host = '0.0.0.0') {
            return new Promise((resolve, reject) => {
                server = (0, http_1.createServer)(async (req, res) => {
                    try {
                        // Handle admin endpoints if enabled
                        if (options.enableAdmin && req.url?.startsWith('/_sandbox/')) {
                            await handleAdminRequest(req, res, sandbox, logger);
                            return;
                        }
                        // Add CORS headers for all requests
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sandbox-Session');
                        // Handle preflight OPTIONS requests
                        if (req.method === 'OPTIONS') {
                            res.writeHead(204);
                            res.end();
                            return;
                        }
                        // Delegate to sandbox
                        await sandbox.handleRequest(req, res);
                    }
                    catch (error) {
                        logger?.error({ error }, 'Unhandled error in request processing');
                        if (!res.headersSent) {
                            res.writeHead(500, { 'content-type': 'application/json' });
                            res.end(JSON.stringify({
                                type: 'about:blank',
                                title: 'Internal Server Error',
                                status: 500,
                                detail: 'An unexpected error occurred'
                            }));
                        }
                    }
                });
                server.on('error', (error) => {
                    if ('code' in error && error.code === 'EADDRINUSE') {
                        reject(new Error(`Port ${port} is already in use`));
                    }
                    else {
                        reject(error);
                    }
                });
                server.listen(port, host, () => {
                    resolve();
                });
            });
        },
        async close() {
            return new Promise((resolve, reject) => {
                if (!server) {
                    resolve();
                    return;
                }
                server.close((error) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
    };
}
/**
 * Handle admin endpoints for the sandbox server
 */
async function handleAdminRequest(req, res, sandbox, logger) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    try {
        switch (path) {
            case '/_sandbox/health':
                await handleHealthCheck(req, res);
                break;
            case '/_sandbox/info':
                await handleInfo(req, res, sandbox);
                break;
            case '/_sandbox/state':
                await handleStateManagement(req, res, sandbox, url);
                break;
            case '/_sandbox/reset':
                if (req.method === 'POST') {
                    await handleReset(req, res, sandbox);
                }
                else {
                    res.writeHead(405, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({
                        type: 'about:blank',
                        title: 'Method Not Allowed',
                        status: 405,
                        detail: 'Only POST method is allowed for reset endpoint'
                    }));
                }
                break;
            case '/_sandbox/metrics':
                await handleMetrics(req, res, sandbox);
                break;
            default:
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({
                    type: 'about:blank',
                    title: 'Not Found',
                    status: 404,
                    detail: 'Admin endpoint not found'
                }));
        }
    }
    catch (error) {
        logger?.error({ error }, 'Error handling admin request');
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
            type: 'about:blank',
            title: 'Internal Server Error',
            status: 500,
            detail: 'Error processing admin request'
        }));
    }
}
async function handleHealthCheck(_req, res) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../../package.json').version
    }));
}
async function handleInfo(_req, res, _sandbox) {
    // This would require exposing some info from the sandbox
    // For now, return basic info
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
        name: 'OAS Sandbox',
        version: require('../../package.json').version,
        description: 'OpenAPI Sandbox Server',
        endpoints: [
            '/_sandbox/health - Health check',
            '/_sandbox/info - Server information',
            '/_sandbox/state - State management',
            '/_sandbox/reset - Reset server state',
            '/_sandbox/metrics - Server metrics'
        ]
    }));
}
async function handleStateManagement(_req, res, _sandbox, _url) {
    // const sessionId = req.headers['x-sandbox-session'] || 'GLOBAL';
    // const key = url.searchParams.get('key');
    // const scope = url.searchParams.get('scope') || 'session';
    // This would require exposing state management from sandbox
    // For now, return a placeholder response
    res.writeHead(501, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
        type: 'about:blank',
        title: 'Not Implemented',
        status: 501,
        detail: 'State management endpoint not yet implemented'
    }));
}
async function handleReset(_req, res, _sandbox) {
    // This would require exposing reset functionality from sandbox
    // For now, return a placeholder response
    res.writeHead(501, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
        type: 'about:blank',
        title: 'Not Implemented',
        status: 501,
        detail: 'Reset endpoint not yet implemented'
    }));
}
async function handleMetrics(_req, res, _sandbox) {
    // Basic metrics - in a real implementation, this would track request counts, response times, etc.
    const metrics = {
        requests_total: 0, // Would be tracked
        requests_by_status: {},
        response_time_avg: 0,
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(metrics));
}
//# sourceMappingURL=server-adapter.js.map