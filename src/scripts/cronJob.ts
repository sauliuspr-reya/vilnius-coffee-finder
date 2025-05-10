import cron from 'node-cron';
import fetchCoffeePlaces from './fetchCoffeePlaces';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Schedule the job to run once a week (every Sunday at midnight)
// You can adjust this schedule as needed
// Format: minute hour day-of-month month day-of-week
// '0 0 * * 0' = At 00:00 on Sunday
const CRON_SCHEDULE = '0 0 * * 0';

console.log(`Setting up cron job to fetch coffee places with schedule: ${CRON_SCHEDULE}`);

cron.schedule(CRON_SCHEDULE, async () => {
  console.log(`Running scheduled job at ${new Date().toISOString()}`);
  try {
    await fetchCoffeePlaces();
    console.log('Scheduled job completed successfully');
  } catch (error) {
    console.error('Error in scheduled job:', error);
  }
});

// Also run immediately on startup
console.log('Running initial fetch...');
fetchCoffeePlaces()
  .then(() => console.log('Initial fetch completed'))
  .catch(error => console.error('Error in initial fetch:', error));

console.log('Cron job server is running. Press Ctrl+C to exit.');
