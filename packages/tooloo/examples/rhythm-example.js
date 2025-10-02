/**
 * Example: Using the TooLoo Rhythm
 *
 * This file demonstrates how to use the Rhythm module for scheduling,
 * timing, and temporal coordination of tasks
 */

const { Rhythm, Schedule, CronParser, ScheduleType, ScheduleStatus } = require('../rhythm');
const { Director } = require('../director');
const { AssistantFactory } = require('../assistant');
const { MultiProviderOrchestrator } = require('../../engine/src/orchestrator');

// Example 1: Basic scheduling - run once
async function basicScheduleExample() {
  console.log('\n=== Example 1: Basic One-Time Schedule ===\n');

  const rhythm = new Rhythm();
  rhythm.start();

  // Schedule a task to run after 2 seconds
  const schedule = rhythm.scheduleOnce(
    async () => {
      console.log('✅ Task executed after delay!');
      return { message: 'Task complete' };
    },
    2000,
    { name: 'Delayed Task' }
  );

  console.log('Task scheduled. Next run:', schedule.nextRun);

  // Wait for completion
  await new Promise(resolve => {
    rhythm.on('schedule:executed', ({ schedule, result }) => {
      console.log('Result:', result);
      rhythm.stop();
      resolve();
    });
  });
}

// Example 2: Interval scheduling
async function intervalScheduleExample() {
  console.log('\n=== Example 2: Interval Schedule ===\n');

  const rhythm = new Rhythm();
  rhythm.start();

  let counter = 0;

  // Run every 1 second, max 5 times
  const schedule = rhythm.scheduleInterval(
    async () => {
      counter++;
      console.log(`⏰ Tick ${counter}`);
      return { tick: counter };
    },
    1000,
    { name: 'Heartbeat', maxExecutions: 5 }
  );

  // Monitor execution
  rhythm.on('schedule:executed', ({ schedule, executionTime }) => {
    console.log(`   Executed in ${executionTime}ms`);
  });

  // Wait for completion
  await new Promise(resolve => {
    const checkCompletion = setInterval(() => {
      if (schedule.status === ScheduleStatus.COMPLETED) {
        console.log(`\n✅ Schedule completed. Total executions: ${schedule.executionCount}`);
        clearInterval(checkCompletion);
        rhythm.stop();
        resolve();
      }
    }, 500);
  });
}

// Example 3: Cron scheduling
async function cronScheduleExample() {
  console.log('\n=== Example 3: Cron Schedule ===\n');

  const rhythm = new Rhythm({ cronCheckInterval: 5000 }); // Check every 5 seconds for testing
  rhythm.start();

  // Schedule to run every minute at second 0
  // In real use: "0 9 * * *" = Every day at 9:00 AM
  // For demo: "* * * * *" = Every minute
  const schedule = rhythm.scheduleCron(
    async () => {
      console.log('🕐 Cron job executed at:', new Date().toLocaleTimeString());
      return { timestamp: Date.now() };
    },
    '* * * * *', // Every minute
    { name: 'Minute Report', maxExecutions: 3 }
  );

  console.log('Cron schedule created');
  console.log('Expression:', schedule.cronExpression);
  console.log('Next run:', schedule.nextRun);

  // Monitor
  rhythm.on('schedule:executed', ({ schedule }) => {
    console.log(`   Execution count: ${schedule.executionCount}/${schedule.maxExecutions}`);
  });

  // Wait for completion
  await new Promise(resolve => {
    const checkCompletion = setInterval(() => {
      if (schedule.status === ScheduleStatus.COMPLETED) {
        console.log('\n✅ Cron schedule completed');
        clearInterval(checkCompletion);
        rhythm.stop();
        resolve();
      }
    }, 1000);
  });
}

// Example 4: Daily and Weekly scheduling
async function dailyWeeklyExample() {
  console.log('\n=== Example 4: Daily & Weekly Schedules ===\n');

  const rhythm = new Rhythm();
  rhythm.start();

  // Schedule daily at 9:00 AM
  const dailySchedule = rhythm.scheduleDaily(
    async () => {
      console.log('📅 Daily report generated');
      return { type: 'daily', date: new Date() };
    },
    '9:00',
    { name: 'Daily Report' }
  );

  // Schedule weekly on Monday (1) at 10:00 AM
  const weeklySchedule = rhythm.scheduleWeekly(
    async () => {
      console.log('📊 Weekly summary generated');
      return { type: 'weekly', date: new Date() };
    },
    1, // Monday
    '10:00',
    { name: 'Weekly Summary' }
  );

  console.log('Daily schedule next run:', dailySchedule.nextRun);
  console.log('Weekly schedule next run:', weeklySchedule.nextRun);

  // In production, these would run automatically
  // For demo, we'll just show they're scheduled
  setTimeout(() => {
    rhythm.stop();
  }, 2000);
}

// Example 5: Integrating Rhythm with Director and Assistant
async function rhythmDirectorIntegrationExample() {
  console.log('\n=== Example 5: Rhythm + Director + Assistant Integration ===\n');

  // Set up the full stack
  const orchestrator = new MultiProviderOrchestrator({
    openai: { apiKey: process.env.OPENAI_API_KEY }
  });

  const factory = new AssistantFactory(orchestrator);
  const assistant = factory.createGeneral();

  const director = new Director();
  director.registerAssistant(assistant);

  const rhythm = new Rhythm();
  rhythm.start();

  // Schedule periodic tasks to be submitted to director
  const schedule = rhythm.scheduleInterval(
    async () => {
      console.log('🎯 Submitting scheduled task to Director...');

      const task = director.submitTask({
        type: 'general',
        description: `What is the current time? It's ${new Date().toLocaleTimeString()}`
      });

      return { taskId: task.id };
    },
    3000,
    { name: 'Periodic AI Task', maxExecutions: 3 }
  );

  // Monitor director tasks
  director.on('task:completed', ({ task }) => {
    console.log('   ✅ Director task completed:', task.output?.content?.substring(0, 50));
  });

  // Wait for completion
  await new Promise(resolve => {
    rhythm.on('schedule:executed', ({ schedule }) => {
      if (schedule.status === ScheduleStatus.COMPLETED) {
        setTimeout(() => {
          rhythm.stop();
          resolve();
        }, 2000);
      }
    });
  });
}

// Example 6: Heartbeat monitoring
async function heartbeatMonitoringExample() {
  console.log('\n=== Example 6: Heartbeat Monitoring ===\n');

  const rhythm = new Rhythm({ heartbeatInterval: 1000 });

  let heartbeatCount = 0;

  rhythm.on('heartbeat', ({ uptime, stats }) => {
    heartbeatCount++;
    console.log(`💓 Heartbeat ${heartbeatCount} - Uptime: ${Math.round(uptime / 1000)}s - Active schedules: ${stats.activeSchedules}`);
  });

  rhythm.start();

  // Schedule some tasks
  rhythm.scheduleInterval(() => console.log('Task 1'), 5000, { name: 'Task 1' });
  rhythm.scheduleInterval(() => console.log('Task 2'), 3000, { name: 'Task 2' });

  // Run for 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  const health = rhythm.getHealth();
  console.log('\n📊 Health Status:');
  console.log('   Uptime:', Math.round(health.uptime / 1000), 'seconds');
  console.log('   Is Healthy:', health.isHealthy);
  console.log('   Last Heartbeat:', health.lastHeartbeat.toLocaleTimeString());

  rhythm.stop();
}

// Example 7: Error handling and retries
async function errorHandlingExample() {
  console.log('\n=== Example 7: Error Handling & Retries ===\n');

  const rhythm = new Rhythm();
  rhythm.start();

  let attemptCount = 0;

  const schedule = rhythm.scheduleInterval(
    async () => {
      attemptCount++;
      console.log(`🔄 Attempt ${attemptCount}`);

      // Fail on first 2 attempts, succeed on 3rd
      if (attemptCount < 3) {
        throw new Error('Simulated failure');
      }

      console.log('✅ Success!');
      return { success: true };
    },
    2000,
    {
      name: 'Flaky Task',
      maxRetries: 3,
      retryOnError: true,
      maxExecutions: 1
    }
  );

  rhythm.on('schedule:error', ({ schedule, error }) => {
    console.log('   ❌ Error:', error.message);
  });

  rhythm.on('schedule:retry', ({ schedule, attempt }) => {
    console.log(`   🔁 Retry ${attempt}/${schedule.maxRetries}`);
  });

  rhythm.on('schedule:executed', ({ schedule }) => {
    console.log('   ✅ Finally succeeded!');
  });

  // Wait for completion
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (schedule.status === ScheduleStatus.COMPLETED || schedule.status === ScheduleStatus.FAILED) {
        clearInterval(checkInterval);
        rhythm.stop();
        resolve();
      }
    }, 500);
  });

  console.log('\nFinal status:', schedule.status);
  console.log('Total attempts:', attemptCount);
}

// Example 8: Pause and resume schedules
async function pauseResumeExample() {
  console.log('\n=== Example 8: Pause & Resume ===\n');

  const rhythm = new Rhythm();
  rhythm.start();

  let executionCount = 0;

  const schedule = rhythm.scheduleInterval(
    async () => {
      executionCount++;
      console.log(`⏰ Execution ${executionCount}`);
      return { count: executionCount };
    },
    1000,
    { name: 'Pausable Task' }
  );

  // Pause after 3 executions
  rhythm.on('schedule:executed', ({ schedule }) => {
    if (schedule.executionCount === 3) {
      console.log('\n⏸️  Pausing schedule...');
      rhythm.pauseSchedule(schedule.id);

      // Resume after 2 seconds
      setTimeout(() => {
        console.log('▶️  Resuming schedule...\n');
        rhythm.resumeSchedule(schedule.id);
      }, 2000);
    }

    if (schedule.executionCount === 6) {
      console.log('\n🛑 Stopping schedule');
      rhythm.cancelSchedule(schedule.id);
      rhythm.stop();
    }
  });

  await new Promise(resolve => {
    rhythm.on('schedule:cancelled', resolve);
  });
}

// Example 9: Advanced cron patterns
async function advancedCronExample() {
  console.log('\n=== Example 9: Advanced Cron Patterns ===\n');

  const rhythm = new Rhythm();

  // Examples of cron patterns (won't actually run, just show they're valid)
  const patterns = [
    { expression: '0 9 * * *', description: 'Every day at 9:00 AM' },
    { expression: '30 14 * * 1-5', description: 'Weekdays at 2:30 PM' },
    { expression: '0 0 1 * *', description: 'First day of every month at midnight' },
    { expression: '0 12 * * 0', description: 'Every Sunday at noon' },
    { expression: '*/15 * * * *', description: 'Every 15 minutes' }
  ];

  console.log('Cron Pattern Examples:\n');

  patterns.forEach(({ expression, description }) => {
    try {
      const cronSpec = CronParser.parse(expression);
      const nextRun = CronParser.getNextRun(cronSpec);
      console.log(`📅 "${expression}"`);
      console.log(`   ${description}`);
      console.log(`   Next run: ${nextRun?.toLocaleString()}\n`);
    } catch (error) {
      console.log(`❌ Invalid: "${expression}" - ${error.message}\n`);
    }
  });
}

// Example 10: Statistics and monitoring
async function statisticsExample() {
  console.log('\n=== Example 10: Statistics & Monitoring ===\n');

  const rhythm = new Rhythm();
  rhythm.start();

  // Create multiple schedules
  rhythm.scheduleInterval(() => console.log('Task 1'), 1000, { name: 'Fast Task', maxExecutions: 5 });
  rhythm.scheduleInterval(() => console.log('Task 2'), 2000, { name: 'Medium Task', maxExecutions: 3 });
  rhythm.scheduleOnce(() => console.log('Task 3'), 3000, { name: 'One-time Task' });

  // Monitor stats every second
  const statsInterval = setInterval(() => {
    const stats = rhythm.getStats();
    console.log('\n📊 Rhythm Stats:');
    console.log(`   Total Schedules: ${stats.totalSchedules}`);
    console.log(`   Active: ${stats.activeSchedules}`);
    console.log(`   Completed: ${stats.completedSchedules}`);
    console.log(`   Total Executions: ${stats.totalExecutions}`);
    console.log(`   Failed Executions: ${stats.failedExecutions}`);
    console.log(`   Avg Execution Time: ${Math.round(stats.avgExecutionTime)}ms`);
  }, 2000);

  // Run for 8 seconds
  await new Promise(resolve => setTimeout(resolve, 8000));

  clearInterval(statsInterval);
  rhythm.stop();

  // Final stats
  const finalStats = rhythm.getStats();
  console.log('\n📈 Final Statistics:');
  console.log(JSON.stringify(finalStats, null, 2));
}

// Main runner
async function main() {
  try {
    // Run examples (uncomment the ones you want to try)

    // await basicScheduleExample();
    // await intervalScheduleExample();
    // await cronScheduleExample();
    // await dailyWeeklyExample();
    // await rhythmDirectorIntegrationExample();
    // await heartbeatMonitoringExample();
    // await errorHandlingExample();
    // await pauseResumeExample();
    // await advancedCronExample();
    // await statisticsExample();

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
  basicScheduleExample,
  intervalScheduleExample,
  cronScheduleExample,
  dailyWeeklyExample,
  rhythmDirectorIntegrationExample,
  heartbeatMonitoringExample,
  errorHandlingExample,
  pauseResumeExample,
  advancedCronExample,
  statisticsExample
};