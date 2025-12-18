/**
 * @file API entrypoint
 * @version 1.0.0
 * @skill-os true
 */

import { createApp } from './app.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
