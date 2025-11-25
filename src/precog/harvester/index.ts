// @version 2.1.281
import { StaticCollector } from './collectors/static-collector.js';
import { DynamicCollector } from './collectors/dynamic-collector.js';
import { Refinery } from './refinery/index.js';
import { TruthEngine } from './truth-engine.js';
import { HarvestRequest, HarvestResult } from './types.js';
import { bus } from '../../core/event-bus.js';
import { spawn } from 'child_process';
import * as path from 'path';

export class Harvester {
    private staticCollector: StaticCollector;
    private dynamicCollector: DynamicCollector;
    private refinery: Refinery;
    private truthEngine: TruthEngine;

    constructor() {
        this.staticCollector = new StaticCollector();
        this.dynamicCollector = new DynamicCollector();
        this.refinery = new Refinery();
        this.truthEngine = new TruthEngine();
        this.setupListeners();
        console.log("[Harvester] Omni-Harvester Engine Initialized");
    }

    private setupListeners() {
        bus.on('harvester:request', async (event: any) => {
            try {
                const result = await this.harvest(event.payload);
                bus.publish('precog', 'harvester:result', {
                    requestId: event.payload.requestId,
                    data: result
                });
            } catch (error: any) {
                bus.publish('precog', 'harvester:error', {
                    requestId: event.payload.requestId,
                    error: error.message
                });
            }
        });
    }
// ...existing code...
                try {
                    const jsonResponse = JSON.parse(output);
                    if (jsonResponse.status === 'error') {
                        reject(new Error(jsonResponse.error));
                    } else {
                        resolve({
                            url: request.url,
                            content: jsonResponse.transcript,
                            metadata: {
                                ...jsonResponse.metadata,
                                url: request.url,
                                timestamp: new Date().toISOString(),
                                contentType: 'media/transcript'
                            },
                            raw: jsonResponse
                        });
                    }
                } catch (e: any) {
                    reject(new Error(`Failed to parse media processor output: ${e.message}`));
                }
            });
        });
    }
}

    async harvest(request: HarvestRequest): Promise<any> {
        console.log(`[Harvester] Processing request for: ${request.url} (${request.type})`);
        
        let result: HarvestResult;

        // 1. Collection
        if (request.type === 'dynamic') {
            result = await this.dynamicCollector.collect(request);
        } else if (request.type === 'media') {
            result = await this.collectMedia(request);
        } else {
            result = await this.staticCollector.collect(request);
        }

        // 2. Refinery
        const refinedData = await this.refinery.refine(result.content);

        // 3. Truth Engine (Consensus & Validation)
        const verification = await this.truthEngine.verify(refinedData, `Source: ${request.url}`);

        // 4. Memory Integration
        if (verification.isAccurate) {
            bus.publish('cortex', 'memory:store', {
                content: refinedData,
                type: 'external_knowledge',
                tags: ['harvester', request.type, ...verification.sources],
                metadata: {
                    url: request.url,
                    verification,
                    original: result.metadata
                }
            });
        }

        // 5. Integration (Return combined result)
        return {
            source: result,
            refined: refinedData,
            verification
        };
    }

    private async collectMedia(request: HarvestRequest): Promise<HarvestResult> {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(process.cwd(), 'src/precog/harvester/sensory/processor.py');
            const pythonProcess = spawn('python3', [scriptPath]);

            let output = '';
            let errorOutput = '';

            // Send input JSON
            pythonProcess.stdin.write(JSON.stringify(request));
            pythonProcess.stdin.end();

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Media processor failed (code ${code}): ${errorOutput}`));
                    return;
                }

                try {
                    const jsonResponse = JSON.parse(output);
                    if (jsonResponse.status === 'error') {
                        reject(new Error(jsonResponse.error));
                    } else {
                        resolve({
                            content: jsonResponse.transcript,
                            metadata: {
                                ...jsonResponse.metadata,
                                url: request.url,
                                timestamp: new Date().toISOString(),
                                contentType: 'media/transcript'
                            },
                            raw: jsonResponse
                        });
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse media processor output: ${e.message}`));
                }
            });
        });
    }
}

export const harvester = new Harvester();
