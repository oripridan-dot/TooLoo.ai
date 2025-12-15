/**
 * @file Synapsys Singularity - HTTP Server
 * @description The Universal Kernel Server with ONE endpoint to rule them all
 * @version 2.0.0
 *
 * SYNAPSYS SINGULARITY ARCHITECTURE
 * =================================
 * The server needs ONE route: /synapsys/invoke
 * This endpoint handles ALL skill interactions - the frontend just sends intent.
 *
 * Legacy endpoints maintained for backward compatibility:
 * - POST /synapsys/execute - Direct skill execution (deprecated)
 * - POST /synapsys/intent - Natural language routing (deprecated)
 * - GET /synapsys/skills - List available skills
 * - GET /synapsys/status - Kernel status
 */
import { Router, Request, Response, NextFunction } from 'express';
export declare function createKernelRouter(): Router;
export declare function kernelErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
export declare function startKernelServer(port?: number): Promise<void>;
export default createKernelRouter;
//# sourceMappingURL=server.d.ts.map