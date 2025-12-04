import { Command } from 'commander';
import { readConfig } from '../config.js';
import axios from 'axios';

export const deployCommand = new Command('deploy')
  .description('Deploy the current project')
  .action(async (options) => {
    const config = await readConfig('tooloo.yaml');

    if (!config) {
      console.error('Error: tooloo.yaml not found.');
      process.exit(1);
    }

    const projectId = config.project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    console.log(`Deploying project: ${config.project.name} (${projectId})...`);

    try {
      // First ensure project exists (optional, but good practice)
      // For this demo, we'll just try to deploy.
      // If the project doesn't exist in Nexus, the deploy endpoint might fail or we might need to create it first.
      // Let's assume the project exists or we just hit the deploy endpoint.

      const response = await axios.post(
        `http://127.0.0.1:4000/api/v1/projects/${projectId}/deploy`,
        {
          target: config.deploy?.target || 'local',
          config: config,
        }
      );

      if (response.data.ok) {
        console.log('Deployment successful!');
        console.log(`Deployment ID: ${response.data.deploymentId}`);
        console.log(`Status: ${response.data.status}`);
        console.log(`Timestamp: ${response.data.timestamp}`);
      } else {
        console.error('Deployment failed:', response.data.error);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error('Error: Could not connect to Nexus (is it running on port 4000?)');
      } else if (error.response) {
        console.error(
          `Deployment failed: ${error.response.status} - ${error.response.data.error || error.response.statusText}`
        );
      } else {
        console.error('Error:', error.message);
      }
      process.exit(1);
    }
  });
