// @version 2.2.101

import { responseVisualizer } from '../src/cortex/imagination/response-visualizer';

// Mock the private method access for testing
const visualizer = responseVisualizer as any;

const testCases = [
  `graph TD
    Monolithic Application --> Microservices Architecture`,
  `graph TD
    User[User] --> Monolithic Application`,
  `graph TD
    A --> B`,
  `graph TD
    Node A --> Node B`,
  `graph TD
    subgraph My System
      A --> B
    end`
];

console.log("--- Testing Mermaid Sanitizer ---");

testCases.forEach((code, index) => {
  console.log(`\nTest Case ${index + 1}:`);
  console.log("Original:");
  console.log(code);
  const sanitized = visualizer.sanitizeMermaid(code);
  console.log("Sanitized:");
  console.log(sanitized);
});
