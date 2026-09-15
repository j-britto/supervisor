import { emailQueue } from './emailQueue.js';

export function startQueueWorkers() {
  console.log('[Queue Worker] 🚀 Background queue workers started.');

  emailQueue.on('task:enqueued', (task) => {
    console.log(`[Queue Worker] Enqueued task ${task.id} (${task.type})`);
  });

  emailQueue.on('task:completed', (task) => {
    console.log(`[Queue Worker] ✅ Task ${task.id} completed successfully.`);
  });

  emailQueue.on('task:failed', (task) => {
    console.error(`[Queue Worker] ❌ Task ${task.id} permanently failed: ${task.error}`);
  });

  emailQueue.on('task:retrying', (task) => {
    console.warn(`[Queue Worker] 🔄 Task ${task.id} scheduled for retry (Attempt ${task.attempts}/${task.maxAttempts})`);
  });
}

export default startQueueWorkers;
