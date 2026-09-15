import EventEmitter from 'events';
import { sendEmail } from '../services/emailService.js';
import { executeSQL, getOracleStatus } from '../config/oracle.js';

class EmailQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
    this.concurrency = 2;
    this.activeWorkers = 0;
    this.completedTasks = [];
    this.failedTasks = [];
  }

  /**
   * Add email job to the queue
   */
  async enqueue(emailJob) {
    const task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'SEND_EMAIL',
      payload: emailJob,
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: emailJob.maxAttempts || 3,
      createdAt: new Date().toISOString(),
      processedAt: null,
      error: null
    };

    this.queue.push(task);
    this.emit('task:enqueued', task);

    // Persist to Oracle if connected
    const status = getOracleStatus();
    if (status.connected) {
      try {
        await executeSQL(
          `INSERT INTO PSMS_QUEUE_TASKS (ID, TASK_TYPE, PAYLOAD, STATUS, ATTEMPTS, MAX_ATTEMPTS, CREATED_AT)
           VALUES (:id, :type, :payload, :status, :attempts, :maxAttempts, CURRENT_TIMESTAMP)`,
          {
            id: task.id,
            type: task.type,
            payload: JSON.stringify(task.payload),
            status: task.status,
            attempts: task.attempts,
            maxAttempts: task.maxAttempts
          }
        );
      } catch (e) {
        // Continue with in-memory queue
      }
    }

    // Trigger processing
    this.processNext();
    return task;
  }

  /**
   * Process next jobs in queue respecting concurrency
   */
  async processNext() {
    if (this.queue.length === 0 || this.activeWorkers >= this.concurrency) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers++;
    task.status = 'PROCESSING';
    task.attempts++;
    this.emit('task:processing', task);

    try {
      const result = await sendEmail(task.payload);
      if (result.success) {
        task.status = 'COMPLETED';
        task.processedAt = new Date().toISOString();
        task.result = result;
        this.completedTasks.unshift(task);
        if (this.completedTasks.length > 50) this.completedTasks.pop();
        this.emit('task:completed', task);
      } else {
        throw new Error(result.error || 'Email delivery failed');
      }
    } catch (err) {
      task.error = err.message;
      if (task.attempts < task.maxAttempts) {
        task.status = 'RETRYING';
        this.emit('task:retrying', task);
        // Exponential backoff retry
        setTimeout(() => {
          this.queue.push(task);
          this.processNext();
        }, task.attempts * 2000);
      } else {
        task.status = 'FAILED';
        task.processedAt = new Date().toISOString();
        this.failedTasks.unshift(task);
        if (this.failedTasks.length > 50) this.failedTasks.pop();
        this.emit('task:failed', task);
      }
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  /**
   * Get queue health and statistics
   */
  getStats() {
    return {
      queued: this.queue.length,
      active: this.activeWorkers,
      completed: this.completedTasks.length,
      failed: this.failedTasks.length,
      recentCompleted: this.completedTasks.slice(0, 5),
      recentFailed: this.failedTasks.slice(0, 5)
    };
  }
}

export const emailQueue = new EmailQueue();
export default emailQueue;
