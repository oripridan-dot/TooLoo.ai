// @version 2.1.257
import { bus } from '../core/event-bus.js';

export interface UserTrait {
    key: string;
    value: any;
    confidence: number;
    source: 'inference' | 'explicit';
}

export class TraitWeaver {
    private traits: Map<string, UserTrait> = new Map();

    constructor() {
        this.initializeDefaultTraits();
        this.setupListeners();
    }

    private initializeDefaultTraits() {
        // Seed with defaults that will be refined over time
        this.setTrait('coding_style', 'concise', 0.5);
        this.setTrait('preferred_language', 'typescript', 0.8);
        this.setTrait('test_framework', 'vitest', 0.9);
    }

    private setupListeners() {
        // Listen for successful generations to reinforce traits
        bus.on('provider:response', (event) => {
            // In the future, analyze response acceptance to tune traits
        });
    }

    public setTrait(key: string, value: any, confidence: number = 1.0) {
        this.traits.set(key, {
            key,
            value,
            confidence,
            source: 'explicit'
        });
    }

    public getProfile(): string {
        const profile = Array.from(this.traits.values())
            .map(t => `- ${t.key}: ${t.value} (Confidence: ${t.confidence})`)
            .join('\n');
        
        return `User Profile:\n${profile}`;
    }

    public injectContext(prompt: string): string {
        // Weave traits into the prompt
        const context = `
[User Traits]
- Style: ${this.traits.get('coding_style')?.value}
- Language: ${this.traits.get('preferred_language')?.value}
- Testing: ${this.traits.get('test_framework')?.value}
`;
        return `${context}\n${prompt}`;
    }
}
