import { API_CONTRACTS } from '../../qa/contracts-generated.js';
import { APIContract } from '../../qa/types/index.js';

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export class ContractToolProvider {
  /**
   * Convert API Contracts to OpenAI Tool Definitions
   */
  static getTools(): OpenAITool[] {
    return Object.values(API_CONTRACTS).map((contract) => this.contractToTool(contract));
  }

  /**
   * Convert a single contract to a tool
   */
  private static contractToTool(contract: APIContract): OpenAITool {
    // Sanitize name: GET /api/v1/system/status -> GET_api_v1_system_status
    // Handle params: GET /api/v1/users/:id -> GET_api_v1_users_id
    const safePath = contract.path
      .replace(/:/g, '')
      .replace(/\//g, '_')
      .replace(/-/g, '_');
    
    const name = `${contract.method.toUpperCase()}${safePath}`;

    // Build JSON Schema for parameters
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (contract.parameters) {
      contract.parameters.forEach((param) => {
        properties[param.name] = {
          type: this.mapType(param.type),
          description: param.description,
        };
        if (param.required) {
          required.push(param.name);
        }
      });
    }

    return {
      type: 'function',
      function: {
        name,
        description: contract.intent,
        parameters: {
          type: 'object',
          properties,
          required,
        },
      },
    };
  }

  private static mapType(type: string): string {
    // Simple mapping, can be expanded
    const lower = type.toLowerCase();
    if (lower.includes('number') || lower.includes('int') || lower.includes('float')) return 'number';
    if (lower.includes('boolean') || lower.includes('bool')) return 'boolean';
    if (lower.includes('array') || lower.includes('[]')) return 'array';
    if (lower.includes('object')) return 'object';
    return 'string';
  }
}
