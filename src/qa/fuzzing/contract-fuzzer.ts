// @version 3.3.175
import { API_CONTRACTS } from '../contracts-generated.js';
import { APIContract } from '../types/index.js';
import fetch from 'node-fetch';

interface FuzzResult {
  contract: string;
  testCase: string;
  input: any;
  status: number;
  passed: boolean;
  error?: string;
}

export class ContractFuzzer {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fuzz a specific contract
   */
  async fuzzContract(key: string): Promise<FuzzResult[]> {
    const contract = API_CONTRACTS[key];
    if (!contract) {
      throw new Error(`Contract not found: ${key}`);
    }

    console.log(`[Fuzzer] 🌪️ Fuzzing ${key}...`);
    const results: FuzzResult[] = [];

    // 1. Test Missing Required Parameters
    if (contract.parameters && contract.parameters.length > 0) {
      const requiredParams = contract.parameters.filter((p) => p.required);
      
      for (const param of requiredParams) {
        const input = this.generateValidInput(contract);
        delete input[param.name]; // Remove required param

        const result = await this.executeRequest(contract, input, 'Missing Required Param');
        
        // We expect 400 Bad Request
        if (result.status === 400) {
          result.passed = true;
        } else {
          result.passed = false;
          result.error = `Expected 400, got ${result.status}`;
        }
        results.push(result);
      }
    }

    // 2. Test Invalid Types (e.g., string for number)
    if (contract.parameters) {
      for (const param of contract.parameters) {
        // Skip string type fuzzing for GET requests as everything is a string in query params
        if (contract.method === 'GET' && param.type === 'string') {
            continue;
        }

        const input = this.generateValidInput(contract);
        input[param.name] = this.generateInvalidType(param.type);

        const result = await this.executeRequest(contract, input, `Invalid Type for ${param.name}`);
        
        // We expect 400 Bad Request (if validation is strict) or 500 (if not handled)
        // Ideally 400.
        if (result.status === 400) {
          result.passed = true;
        } else if (result.status >= 500) {
          result.passed = false;
          result.error = `Server Error (5xx) on invalid input`;
        } else {
           // 200 OK on invalid input is also bad
           result.passed = false;
           result.error = `Accepted invalid input with ${result.status}`;
        }
        results.push(result);
      }
    }

    return results;
  }

  private generateValidInput(contract: APIContract): any {
    const input: any = {};
    if (!contract.parameters) return input;

    for (const param of contract.parameters) {
      if (param.type === 'number') input[param.name] = 123;
      else if (param.type === 'boolean') input[param.name] = true;
      else input[param.name] = 'test_value';
    }
    return input;
  }

  private generateInvalidType(type: string): any {
    if (type === 'number') return 'not_a_number';
    if (type === 'boolean') return 'not_a_boolean';
    return 12345; // number for string
  }

  private async executeRequest(contract: APIContract, input: any, testCase: string): Promise<FuzzResult> {
    let url = `${this.baseUrl}${contract.path}`; // Note: doesn't handle path params yet
    const method = contract.method;
    
    let options: any = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (method === 'GET') {
      const params = new URLSearchParams(input);
      url += `?${params.toString()}`;
    } else {
      options.body = JSON.stringify(input);
    }

    try {
      // Skip actual execution for now if path has params
      if (contract.path.includes(':')) {
         return {
            contract: `${contract.method} ${contract.path}`,
            testCase,
            input,
            status: 0,
            passed: true, // Skipped
            error: 'Skipped: Path params not supported yet'
         };
      }

      const res = await fetch(url, options);
      return {
        contract: `${contract.method} ${contract.path}`,
        testCase,
        input,
        status: res.status,
        passed: false, // Set by caller
      };
    } catch (error: any) {
      return {
        contract: `${contract.method} ${contract.path}`,
        testCase,
        input,
        status: 0,
        passed: false,
        error: error.message,
      };
    }
  }
}
