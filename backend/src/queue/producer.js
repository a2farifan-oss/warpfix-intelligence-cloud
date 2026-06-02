const { Queue } = require('bullmq');
const { createRedisConnection } = require('./redis');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Derive a STABLE job id from the event so GitHub webhook redeliveries (which
// happen on any slow/non-2xx response) collapse to a single job instead of
// spawning a fresh repair each time. BullMQ ignores an add() whose jobId is
// already queued/active or still retained in removeOnComplete/Fail — so this is
// the idempotency key GitHub's own webhook best-practices recommend. We fall
// back to a random id when the identifying fields are missing.
function repairJobId(data) {
  if (data && data.type === 'ci_failure' && data.repository?.id && data.workflow_run?.id) {
    return `repair-${data.repository.id}-${data.workflow_run.id}`;
  }
  return uuidv4();
}

function reviewJobId(data) {
  const pr = data?.pull_request;
  // Include head_sha so a genuine new push (synchronize) re-reviews, but a
  // duplicate delivery of the same push does not.
  if (data?.repository?.id && pr?.number && pr?.head_sha) {
    return `review-${data.repository.id}-${pr.number}-${pr.head_sha}`;
  }
  return uuidv4();
}

let repairQueue = null;
let reviewQueue = null;
let chatQueue = null;

function getRepairQueue() {
  if (!repairQueue) {
    try {
      repairQueue = new Queue('repair-jobs', {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 500 },
        },
      });
    } catch (err) {
      logger.warn('Failed to create repair queue', { error: err.message });
      return null;
    }
  }
  return repairQueue;
}

function getReviewQueue() {
  if (!reviewQueue) {
    try {
      reviewQueue = new Queue('review-jobs', {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 500 },
        },
      });
    } catch (err) {
      logger.warn('Failed to create review queue', { error: err.message });
      return null;
    }
  }
  return reviewQueue;
}

function getChatQueue() {
  if (!chatQueue) {
    try {
      chatQueue = new Queue('chat-jobs', {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 500 },
          removeOnFail: { count: 200 },
        },
      });
    } catch (err) {
      logger.warn('Failed to create chat queue', { error: err.message });
      return null;
    }
  }
  return chatQueue;
}

async function enqueueRepairJob(data) {
  const jobId = repairJobId(data);
  const queue = getRepairQueue();

  if (!queue) {
    logger.warn('Queue not available, job not enqueued', { jobId });
    return jobId;
  }

  await queue.add('repair', { ...data, jobId }, {
    jobId,
    priority: data.type === 'ci_failure' ? 1 : 5,
  });

  logger.info('Repair job enqueued', { jobId, type: data.type });
  return jobId;
}

async function enqueueReviewJob(data) {
  const jobId = reviewJobId(data);
  const queue = getReviewQueue();

  if (!queue) {
    logger.warn('Review queue not available', { jobId });
    return jobId;
  }

  await queue.add('review', { ...data, jobId }, {
    jobId,
    priority: 2,
  });

  logger.info('Review job enqueued', { jobId, pr: data.pull_request?.number });
  return jobId;
}

async function enqueueChatJob(data) {
  const jobId = uuidv4();
  const queue = getChatQueue();

  if (!queue) {
    logger.warn('Chat queue not available', { jobId });
    return jobId;
  }

  await queue.add('chat', { ...data, jobId }, {
    jobId,
    priority: 1, // Chat is high priority (user is waiting)
  });

  logger.info('Chat job enqueued', { jobId, issue: data.issue_number });
  return jobId;
}

module.exports = {
  enqueueRepairJob,
  enqueueReviewJob,
  enqueueChatJob,
  getRepairQueue,
  getReviewQueue,
  getChatQueue,
  repairJobId,
  reviewJobId,
};
