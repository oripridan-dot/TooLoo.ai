/**
 * Example: Using the TooLoo Director
 *
 * This file demonstrates how to use the Director module to orchestrate
 * multiple assistants and manage complex workflows
 */

const { Director, Task, Workflow, TaskPriority, TaskStatus, ExecutionStrategy } = require('../director');
const { AssistantFactory } = require('../assistant');
const { MultiProviderOrchestrator } = require('../../engine/src/orchestrator');

// Example 1: Basic task delegation
async function basicDelegationExample() {
  console.log('\n=== Example 1: Basic Task Delegation ===\n');

  // Set up orchestrator
  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY }
  });

  // Create assistants with different specializations
  const factory = new AssistantFactory(orchestrator);
  const coder = factory.createCoder();
  const reviewer = factory.createArchitect();

  // Create director
  const director = new Director({
    maxConcurrentTasks: 2
  });

  // Register assistants with capabilities
  director.registerAssistant(coder, ['coding', 'implementation']);
  director.registerAssistant(reviewer, ['review', 'architecture']);

  // Listen to events
  director.on('task:started', ({ task, assistantId }) => {
    console.log(`📋 Task "${task.type}" started by ${assistantId}`);
  });

  director.on('task:completed', ({ task }) => {
    console.log(`✅ Task "${task.type}" completed in ${task.getExecutionTime()}ms`);
  });

  // Submit tasks
  const task1 = director.submitTask({
    type: 'coding',
    description: 'Write a function to validate email addresses',
    priority: TaskPriority.NORMAL
  });

  const task2 = director.submitTask({
    type: 'review',
    description: 'Review the email validation approach for security issues',
    priority: TaskPriority.HIGH,
    dependencies: [task1.id] // Wait for task1 to complete
  });

  // Wait for processing to complete
  await new Promise(resolve => {
    director.on('processing:completed', resolve);
  });

  console.log('\nTask 1 output:', task1.output?.content.substring(0, 100));
  console.log('Task 2 output:', task2.output?.content.substring(0, 100));
}

// Example 2: Workflow with dependencies
async function workflowExample() {
  console.log('\n=== Example 2: Workflow with Dependencies ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);
  const assistant = factory.createGeneral();

  const director = new Director();
  director.registerAssistant(assistant);

  // Create a workflow
  const workflow = new Workflow({
    name: 'Blog Post Creation',
    description: 'Create a complete blog post with outline, content, and summary',
    strategy: ExecutionStrategy.SEQUENTIAL
  });

  // Add tasks to workflow (each depends on previous)
  const outlineTask = workflow.addTask({
    type: 'outline',
    description: 'Create an outline for a blog post about AI in healthcare',
    priority: TaskPriority.HIGH
  });

  const contentTask = workflow.addTask({
    type: 'content',
    description: 'Write the full blog post based on the outline',
    dependencies: [outlineTask.id],
    priority: TaskPriority.NORMAL
  });

  const summaryTask = workflow.addTask({
    type: 'summary',
    description: 'Create a tweet-length summary of the blog post',
    dependencies: [contentTask.id],
    priority: TaskPriority.LOW
  });

  // Monitor progress
  director.on('task:completed', () => {
    const progress = workflow.getProgress();
    console.log(`📊 Progress: ${progress.percentage}% (${progress.completed}/${progress.total})`);
  });

  director.on('workflow:completed', ({ workflow }) => {
    console.log(`✅ Workflow "${workflow.name}" completed!`);
  });

  // Submit workflow
  director.submitWorkflow(workflow);

  // Wait for completion
  await new Promise(resolve => {
    director.on('processing:completed', resolve);
  });

  console.log('\nWorkflow status:', workflow.status);
  console.log('All tasks completed:', workflow.isCompleted());
}

// Example 3: Multiple specialized assistants
async function multiAssistantExample() {
  console.log('\n=== Example 3: Multiple Specialized Assistants ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);

  // Create specialized team
  const coder = factory.createCoder();
  const debugger = factory.createDebugger();
  const architect = factory.createArchitect();

  const director = new Director({
    maxConcurrentTasks: 3,
    loadBalancing: true
  });

  // Register team with specific capabilities
  director.registerAssistant(coder, ['coding', 'implementation', 'refactoring']);
  director.registerAssistant(debugger, ['debugging', 'testing', 'error-analysis']);
  director.registerAssistant(architect, ['architecture', 'design', 'review']);

  // Submit various tasks
  const tasks = [
    { type: 'coding', description: 'Implement a REST API endpoint for user authentication' },
    { type: 'debugging', description: 'Analyze why the API returns 500 errors under load' },
    { type: 'architecture', description: 'Design a caching strategy for the API' },
    { type: 'coding', description: 'Implement rate limiting middleware' },
    { type: 'testing', description: 'Create unit tests for authentication logic' }
  ];

  tasks.forEach(taskConfig => {
    director.submitTask({
      ...taskConfig,
      priority: TaskPriority.NORMAL
    });
  });

  // Track which assistant handles which task
  director.on('task:started', ({ task, assistantId }) => {
    const assistant = director.assistants.get(assistantId);
    console.log(`🎯 "${task.type}" task assigned to ${assistant.name}`);
  });

  await new Promise(resolve => {
    director.on('processing:completed', resolve);
  });

  const stats = director.getStats();
  console.log('\n📈 Director Stats:', stats);
}

// Example 4: Priority queue and task cancellation
async function priorityAndCancellationExample() {
  console.log('\n=== Example 4: Priority Queue & Cancellation ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);
  const assistant = factory.createGeneral();

  const director = new Director({
    maxConcurrentTasks: 1 // Process one at a time to see priority in action
  });

  director.registerAssistant(assistant);

  // Submit tasks with different priorities
  const lowPriorityTask = director.submitTask({
    type: 'general',
    description: 'Tell me a joke',
    priority: TaskPriority.LOW
  });

  const normalTask = director.submitTask({
    type: 'general',
    description: 'Explain quantum computing',
    priority: TaskPriority.NORMAL
  });

  const highPriorityTask = director.submitTask({
    type: 'general',
    description: 'Security alert: analyze this suspicious code',
    priority: TaskPriority.HIGH
  });

  const criticalTask = director.submitTask({
    type: 'general',
    description: 'URGENT: Fix production database connection',
    priority: TaskPriority.CRITICAL
  });

  console.log('Tasks submitted. Execution order by priority:');

  director.on('task:started', ({ task }) => {
    console.log(`▶️  Executing: "${task.description.substring(0, 40)}..." (Priority: ${task.priority})`);
  });

  // Cancel the low priority task
  setTimeout(() => {
    try {
      director.cancelTask(lowPriorityTask.id);
      console.log('🚫 Cancelled low priority task');
    } catch (error) {
      console.log('Could not cancel:', error.message);
    }
  }, 1000);

  await new Promise(resolve => {
    director.on('processing:completed', resolve);
  });

  console.log('\nFinal task statuses:');
  console.log('Low Priority:', lowPriorityTask.status);
  console.log('Normal:', normalTask.status);
  console.log('High:', highPriorityTask.status);
  console.log('Critical:', criticalTask.status);
}

// Example 5: Retry logic and error handling
async function retryAndErrorExample() {
  console.log('\n=== Example 5: Retry Logic & Error Handling ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);
  const assistant = factory.createCoder();

  const director = new Director();
  director.registerAssistant(assistant);

  // Task with retry configuration
  const riskyTask = director.submitTask({
    type: 'coding',
    description: 'Generate code with potential timeout',
    maxRetries: 3,
    timeout: 5000 // 5 second timeout
  });

  director.on('task:retry', ({ task, attempt, error }) => {
    console.log(`🔄 Retry attempt ${attempt}/${task.maxRetries} for task ${task.id}`);
    console.log(`   Reason: ${error.message}`);
  });

  director.on('task:failed', ({ task, error }) => {
    console.log(`❌ Task ${task.id} failed after ${task.retries} retries`);
    console.log(`   Final error: ${error?.message || 'Unknown error'}`);
  });

  director.on('task:completed', ({ task }) => {
    console.log(`✅ Task completed successfully after ${task.retries} retries`);
  });

  await new Promise(resolve => {
    director.on('processing:completed', resolve);
  });
}

// Example 6: Real-time monitoring and statistics
async function monitoringExample() {
  console.log('\n=== Example 6: Real-time Monitoring ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);
  const assistant1 = factory.createCoder();
  const assistant2 = factory.createCoder();

  const director = new Director({
    maxConcurrentTasks: 2,
    loadBalancing: true
  });

  director.registerAssistant(assistant1);
  director.registerAssistant(assistant2);

  // Monitor stats periodically
  const statsInterval = setInterval(() => {
    const stats = director.getStats();
    console.log('\n📊 Current Stats:');
    console.log(`   Queued: ${stats.queuedTasks}`);
    console.log(`   Executing: ${stats.executingTasks}`);
    console.log(`   Completed: ${stats.completedTasks}/${stats.totalTasks}`);
    console.log(`   Failed: ${stats.failedTasks}`);
    console.log(`   Avg Execution Time: ${Math.round(stats.avgTaskExecutionTime)}ms`);
  }, 2000);

  // Submit multiple tasks
  for (let i = 0; i < 5; i++) {
    director.submitTask({
      type: 'coding',
      description: `Write a function for task ${i + 1}`,
      priority: TaskPriority.NORMAL
    });
  }

  await new Promise(resolve => {
    director.on('processing:completed', () => {
      clearInterval(statsInterval);
      resolve();
    });
  });

  console.log('\n✅ All tasks processed!');
}

// Example 7: Pause and resume processing
async function pauseResumeExample() {
  console.log('\n=== Example 7: Pause & Resume ===\n');

  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);
  const assistant = factory.createGeneral();

  const director = new Director();
  director.registerAssistant(assistant);

  // Submit several tasks
  for (let i = 0; i < 5; i++) {
    director.submitTask({
      type: 'general',
      description: `Task ${i + 1}`
    });
  }

  director.on('task:completed', ({ task }) => {
    console.log(`✅ Completed: ${task.description}`);
  });

  // Pause after 2 seconds
  setTimeout(() => {
    director.pause();
    console.log('\n⏸️  Processing PAUSED');

    // Resume after another 2 seconds
    setTimeout(() => {
      console.log('▶️  Processing RESUMED\n');
      director.resume();
    }, 2000);
  }, 2000);

  await new Promise(resolve => {
    director.on('processing:completed', resolve);
  });
}

// Main runner
async function main() {
  try {
    // Run examples (uncomment the ones you want to try)

    // await basicDelegationExample();
    // await workflowExample();
    // await multiAssistantExample();
    // await priorityAndCancellationExample();
    // await retryAndErrorExample();
    // await monitoringExample();
    // await pauseResumeExample();

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
  basicDelegationExample,
  workflowExample,
  multiAssistantExample,
  priorityAndCancellationExample,
  retryAndErrorExample,
  monitoringExample,
  pauseResumeExample
};