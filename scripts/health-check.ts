// @version 2.2.341
import fetch from 'node-fetch';
import chalk from 'chalk';

async function checkHealth() {
  console.log(chalk.blue('🏥 Performing System Health Check...'));

  const endpoints = [
    { name: 'Nexus (Backend)', url: 'http://localhost:4000/health' },
    { name: 'Frontend', url: 'http://localhost:5173/' }
  ];

  let allHealthy = true;

  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(endpoint.url);
      const duration = Date.now() - start;

      if (response.ok) {
        console.log(chalk.green(`✅ ${endpoint.name}: UP (${duration}ms)`));
      } else {
        console.log(chalk.red(`❌ ${endpoint.name}: DOWN (Status ${response.status})`));
        allHealthy = false;
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${endpoint.name}: UNREACHABLE`));
      allHealthy = false;
    }
  }

  if (allHealthy) {
    console.log(chalk.green('\n✨ All systems operational!'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n⚠️  Some systems are down.'));
    process.exit(1);
  }
}

checkHealth();
