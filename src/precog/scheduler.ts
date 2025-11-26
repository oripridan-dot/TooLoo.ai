// @version 2.1.279
import { bus } from '../core/event-bus.js';

export interface Job {
    id: string;
    interval: number; // ms
    task: () => void | Promise<void>;
    lastRun: number;
    active: boolean;
}

export class Scheduler {
    private jobs: Map<string, Job> = new Map();
    private timer: NodeJS.Timeout | null = null;

    constructor() {
        console.log("[Scheduler] Initializing Watchtower...");
        this.startLoop();
    }

    register(id: string, interval: number, task: () => void | Promise<void>) {
        this.jobs.set(id, {
            id,
            interval,
            task,
            lastRun: 0,
            active: true
        });
        console.log(`[Scheduler] Registered job: ${id} (${interval}ms)`);
    }

    private startLoop() {
        if (this.timer) return;
        this.timer = setInterval(() => this.checkJobs(), 1000); // Check every second
    }

    private async checkJobs() {
        const now = Date.now();
        for (const job of this.jobs.values()) {
            if (job.active && now - job.lastRun >= job.interval) {
                job.lastRun = now;
                try {
                    await job.task();
                } catch (e) {
                    console.error(`[Scheduler] Job ${job.id} failed:`, e);
                }
            }
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

export const scheduler = new Scheduler();
