// @version 2.1.282
import { Command } from 'commander';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api/v1';

export const systemCommand = new Command('system').description(
  'System management and introspection'
);

systemCommand
  .command('introspect')
  .description('Deep system introspection')
  .action(async () => {
    try {
      const res = await axios.get(`${API_URL}/system/introspect`);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error: any) {
      console.error('Error connecting to system:', error.message);
      console.error('Ensure the Synapsys server is running (npm start).');
    }
  });

systemCommand
  .command('awareness')
  .description('Get system awareness state')
  .action(async () => {
    try {
      const res = await axios.get(`${API_URL}/system/awareness`);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error: any) {
      console.error('Error connecting to system:', error.message);
      console.error('Ensure the Synapsys server is running (npm start).');
    }
  });
