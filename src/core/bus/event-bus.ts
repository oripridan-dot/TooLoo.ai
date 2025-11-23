// @version 2.1.28
import { EventEmitter } from 'events';

export type EventType = 
    | 'system:ready'
    | 'system:file_changed'
    | 'intent:detected'
    | 'provider:request'
    | 'provider:response'
    | 'provider:error'
    | 'precog:prediction'
    | 'memory:ingest'
    | 'memory:query'
    | 'memory:response';

export interface EventPayload<T = any> {
    id: string;
    timestamp: number;
    type: EventType;
    data: T;
    source: string;
}

export class SynapseBus extends EventEmitter {
    private static instance: SynapseBus;

    private constructor() {
        super();
        this.setMaxListeners(50);
    }

    public static getInstance(): SynapseBus {
        if (!SynapseBus.instance) {
            SynapseBus.instance = new SynapseBus();
        }
        return SynapseBus.instance;
    }

    public publish<T>(type: EventType, data: T, source: string = 'system') {
        const payload: EventPayload<T> = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type,
            data,
            source
        };
        this.emit(type, payload);
        this.emit('*', payload); // Wildcard for logging
    }

    public subscribe<T>(type: EventType, handler: (payload: EventPayload<T>) => void) {
        this.on(type, handler);
    }
}
