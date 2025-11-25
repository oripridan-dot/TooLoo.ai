// @version 2.1.28
import { ProviderAdapter, GenerationRequest, GenerationResponse, ProviderConfig } from './types';
import fetch from 'node-fetch';

export abstract class BaseProvider implements ProviderAdapter {
    constructor(protected config: ProviderConfig) {}

    get name() { return this.config.name; }
    get type() { return this.config.type; }

    isAvailable(): boolean {
        if (!this.config.enabled) return false;
        if (this.config.type === 'paid' && !this.config.apiKey) return false;
        return true;
    }

    abstract generate(req: GenerationRequest): Promise<GenerationResponse>;

    protected async fetchJson(url: string, options: any): Promise<any> {
        const res = await fetch(url, options);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Provider ${this.name} error ${res.status}: ${text}`);
        }
        return res.json();
    }
}

export class OpenAIProvider extends BaseProvider {
    async generate(req: GenerationRequest): Promise<GenerationResponse> {
        const start = Date.now();
        const messages = [];
        if (req.system) messages.push({ role: 'system', content: req.system });
        messages.push({ role: 'user', content: req.prompt });

        const data = await this.fetchJson('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages,
                temperature: req.temperature ?? 0.7,
                max_tokens: req.maxTokens
            })
        });

        return {
            content: data.choices[0].message.content,
            provider: this.name,
            model: this.config.model,
            latency: Date.now() - start
        };
    }

    async embed(text: string): Promise<number[]> {
        const data = await this.fetchJson('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "text-embedding-3-small",
                input: text
            })
        });
        return data.data[0].embedding;
    }
}

export class AnthropicProvider extends BaseProvider {
    async generate(req: GenerationRequest): Promise<GenerationResponse> {
        const start = Date.now();
        const messages = [{ role: 'user', content: req.prompt }];
        
        const body: any = {
            model: this.config.model,
            messages,
            max_tokens: req.maxTokens ?? 1024
        };
        if (req.system) body.system = req.system;

        const data = await this.fetchJson('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        return {
            content: data.content[0].text,
            provider: this.name,
            model: this.config.model,
            latency: Date.now() - start
        };
    }
}

export class GeminiProvider extends BaseProvider {
    async generate(req: GenerationRequest): Promise<GenerationResponse> {
        const start = Date.now();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
        
        const contents = [{ role: 'user', parts: [{ text: req.system ? `${req.system}\n\n${req.prompt}` : req.prompt }] }];

        const data = await this.fetchJson(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        return {
            content: data.candidates[0].content.parts[0].text,
            provider: this.name,
            model: this.config.model,
            latency: Date.now() - start
        };
    }
}

export class OllamaProvider extends BaseProvider {
    async generate(req: GenerationRequest): Promise<GenerationResponse> {
        const start = Date.now();
        const messages = [];
        if (req.system) messages.push({ role: 'system', content: req.system });
        messages.push({ role: 'user', content: req.prompt });

        const data = await this.fetchJson(`${this.config.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config.model,
                messages,
                stream: false
            })
        });

        return {
            content: data.message.content,
            provider: this.name,
            model: this.config.model,
            latency: Date.now() - start
        };
    }
}
