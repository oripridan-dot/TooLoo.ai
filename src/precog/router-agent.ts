// @version 2.2.97
/**
 * Interface for AI Model Providers.
 * Allows swapping models without changing business logic.
 */
export interface ProviderInterface {
    name: string;
    generate(prompt: string, options?: any): Promise<string>;
}

/**
 * RouterAgent
 * Analyzes prompt complexity and routes to the appropriate model provider.
 */
export class RouterAgent {
    
    /**
     * Analyzes the complexity of the user prompt.
     * @param prompt The user's input prompt.
     * @returns A complexity score or category.
     */
    private analyzeComplexity(prompt: string): 'SIMPLE' | 'CREATIVE' | 'COMPLEX' {
        const lowerPrompt = prompt.toLowerCase();
        
        // Heuristic-based routing (to be replaced with model-based classification)
        if (lowerPrompt.includes("draw") || lowerPrompt.includes("image") || lowerPrompt.includes("design")) {
            return 'CREATIVE';
        }
        
        if (lowerPrompt.includes("architect") || lowerPrompt.includes("reason") || lowerPrompt.includes("analyze") || prompt.length > 200) {
            return 'COMPLEX';
        }

        return 'SIMPLE';
    }

    /**
     * Routes the prompt to the best provider based on complexity.
     * @param prompt The user's input prompt.
     * @returns The name of the selected provider/model.
     */
    determineRoute(prompt: string): string {
        const complexity = this.analyzeComplexity(prompt);

        switch (complexity) {
            case 'SIMPLE':
                // Simple/Coding -> DeepSeek or Claude 3.5 Sonnet
                return 'DeepSeek'; 
            case 'CREATIVE':
                // Creative/Visual -> OpenAI GPT-4 / DALL-E 3
                return 'OpenAI GPT-4';
            case 'COMPLEX':
                // Reasoning/Logic -> OpenAI o1 / Claude 3 Opus
                return 'Claude 3 Opus';
            default:
                return 'DeepSeek';
        }
    }
}
