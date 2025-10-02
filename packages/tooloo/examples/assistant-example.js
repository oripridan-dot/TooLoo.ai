/**
 * Example: Using the TooLoo Assistant
 *
 * This file demonstrates various ways to use the Assistant module
 */

const { Assistant, AssistantFactory, AssistantRoles, MessageRole } = require('../assistant');
const { MultiProviderOrchestrator } = require('../../engine/src/orchestrator');

// Example 1: Basic assistant usage
async function basicExample() {
  console.log('\n=== Example 1: Basic Assistant Usage ===\n');

  // Set up the orchestrator with providers
  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY }
  });

  // Create an assistant
  const assistant = new Assistant({
    name: 'My Assistant',
    orchestrator
  });

  // Start a conversation
  assistant.startConversation();

  // Chat with the assistant
  const response = await assistant.chat('Hello! Can you help me with JavaScript?');
  console.log('Assistant:', response.response.content);

  // Continue the conversation
  const response2 = await assistant.chat('What are the main features of ES6?');
  console.log('Assistant:', response2.response.content);

  // Get conversation history
  const history = assistant.getHistory();
  console.log('\nConversation has', history.messages.length, 'messages');
}

// Example 2: Using different assistant roles
async function rolesExample() {
  console.log('\n=== Example 2: Assistant Roles ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);

  // Create a coding assistant
  const coder = factory.createCoder();
  coder.startConversation();

  const codeResponse = await coder.chat('Write a function to calculate fibonacci numbers');
  console.log('Coder Assistant:', codeResponse.response.content);

  // Create an architect assistant
  const architect = factory.createArchitect();
  architect.startConversation();

  const archResponse = await architect.chat('Design a microservices architecture for an e-commerce platform');
  console.log('\nArchitect Assistant:', archResponse.response.content);
}

// Example 3: Tool/Function calling
async function toolsExample() {
  console.log('\n=== Example 3: Tools and Functions ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const assistant = new Assistant({
    orchestrator,
    toolsEnabled: true
  });

  // Register a tool
  assistant.registerTool(
    'getCurrentWeather',
    {
      description: 'Get the current weather for a location',
      parameters: {
        location: { type: 'string', required: true },
        units: { type: 'string', default: 'celsius' }
      }
    },
    async (params) => {
      // Mock weather data
      return {
        location: params.location,
        temperature: 22,
        condition: 'Sunny',
        units: params.units || 'celsius'
      };
    }
  );

  // Register another tool
  assistant.registerTool(
    'calculateMath',
    {
      description: 'Perform mathematical calculations',
      parameters: {
        expression: { type: 'string', required: true }
      }
    },
    async (params) => {
      try {
        // Simple eval for demo (use a proper math parser in production)
        const result = eval(params.expression);
        return { expression: params.expression, result };
      } catch (error) {
        return { error: 'Invalid expression' };
      }
    }
  );

  // Use the tools
  const weatherResult = await assistant.executeTool('getCurrentWeather', {
    location: 'San Francisco'
  });
  console.log('Weather:', weatherResult);

  const mathResult = await assistant.executeTool('calculateMath', {
    expression: '2 + 2 * 10'
  });
  console.log('Math:', mathResult);
}

// Example 4: Managing multiple conversations
async function multiConversationExample() {
  console.log('\n=== Example 4: Multiple Conversations ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const assistant = new Assistant({ orchestrator });

  // Start first conversation
  const conv1 = assistant.startConversation(null, { topic: 'JavaScript' });
  await assistant.chat('Tell me about async/await');

  // Start second conversation
  const conv2 = assistant.startConversation(null, { topic: 'Python' });
  await assistant.chat('Explain list comprehensions');

  // Switch back to first conversation
  assistant.switchConversation(conv1);
  await assistant.chat('What about promises?');

  console.log('Conversation 1 history:', assistant.getHistory(conv1).messages.length, 'messages');
  console.log('Conversation 2 history:', assistant.getHistory(conv2).messages.length, 'messages');
}

// Example 5: Event handling
async function eventsExample() {
  console.log('\n=== Example 5: Event Handling ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const assistant = new Assistant({ orchestrator });

  // Listen to events
  assistant.on('conversation:started', (data) => {
    console.log('🎬 Conversation started:', data.conversationId);
  });

  assistant.on('message:added', (data) => {
    console.log('💬 Message added:', data.message.role, '-', data.message.content.substring(0, 50));
  });

  assistant.on('request:start', (data) => {
    console.log('⏳ Request starting...');
  });

  assistant.on('request:complete', (data) => {
    console.log('✅ Request complete. Used:', data.response.usage.totalTokens, 'tokens');
  });

  assistant.on('request:error', (data) => {
    console.log('❌ Request error:', data.error.message);
  });

  // Make some requests
  assistant.startConversation();
  await assistant.chat('Hello!');
  await assistant.chat('How are you?');
}

// Example 6: Changing roles dynamically
async function dynamicRolesExample() {
  console.log('\n=== Example 6: Dynamic Role Changes ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const assistant = new Assistant({ orchestrator });
  assistant.startConversation();

  // Start as general assistant
  const response1 = await assistant.chat('Hello!');
  console.log('General mode:', response1.response.content.substring(0, 100));

  // Switch to coder role
  assistant.setRole('CODER');
  const response2 = await assistant.chat('Write a sorting function');
  console.log('\nCoder mode:', response2.response.content.substring(0, 100));

  // Switch to creative role
  assistant.setRole('CREATIVE');
  const response3 = await assistant.chat('Give me an innovative idea for a mobile app');
  console.log('\nCreative mode:', response3.response.content.substring(0, 100));
}

// Example 7: Export/Import conversations
async function exportImportExample() {
  console.log('\n=== Example 7: Export/Import Conversations ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const assistant1 = new Assistant({ orchestrator });
  assistant1.startConversation();
  await assistant1.chat('Remember this: The secret code is 42');
  await assistant1.chat('What is my favorite color? Blue!');

  // Export the conversation
  const exportedData = assistant1.exportConversation();
  console.log('Exported conversation with', exportedData.messages.length, 'messages');

  // Create a new assistant and import the conversation
  const assistant2 = new Assistant({ orchestrator });
  assistant2.importConversation(exportedData);
  assistant2.switchConversation(exportedData.id);

  const history = assistant2.getHistory();
  console.log('Imported conversation has', history.messages.length, 'messages');
  console.log('First message:', history.messages[0].content);
}

// Example 8: Statistics and monitoring
async function statsExample() {
  console.log('\n=== Example 8: Statistics ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const assistant = new Assistant({ orchestrator });
  assistant.startConversation();

  // Make several requests
  await assistant.chat('Hello!');
  await assistant.chat('Tell me about AI');
  await assistant.chat('What is machine learning?');

  // Get statistics
  const stats = assistant.getStats();
  console.log('Assistant Statistics:');
  console.log('- Total Requests:', stats.totalRequests);
  console.log('- Successful:', stats.successfulRequests);
  console.log('- Failed:', stats.failedRequests);
  console.log('- Total Tokens Used:', stats.totalTokens);
  console.log('- Avg Response Time:', Math.round(stats.avgResponseTime), 'ms');
  console.log('- Active Conversations:', stats.activeConversations);
  console.log('- Registered Tools:', stats.registeredTools);
  console.log('- Current Role:', stats.currentRole);
}

// Main runner
async function main() {
  try {
    // Run examples (uncomment the ones you want to try)

    // await basicExample();
    // await rolesExample();
    // await toolsExample();
    // await multiConversationExample();
    // await eventsExample();
    // await dynamicRolesExample();
    // await exportImportExample();
    // await statsExample();

    console.log('\n✅ Examples completed!\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  basicExample,
  rolesExample,
  toolsExample,
  multiConversationExample,
  eventsExample,
  dynamicRolesExample,
  exportImportExample,
  statsExample
};