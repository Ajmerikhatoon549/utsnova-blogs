// backend/cronJobs.js
// Scheduled (cron) jobs for the blog website.
// Job 1: automatically write one AI blog as a DRAFT on a schedule.

const cron = require('node-cron');
const Blog = require('./models/Blog');
const generateBlog = require('./generateBlog');

// The AI picks one of these topics at random. Add your own topics here.
const TOPICS = [
  'Benefits of cloud computing for small businesses',
  'Beginner tips for learning web development',
  'How to keep your website secure',
  'Ways to improve website performance',
  'Why every developer should learn Git',
  'Getting started with REST APIs',
  'Basics of cybersecurity for everyday users',
  'How to build a strong developer portfolio'
];

// Reuse the same AI code used by the admin "Generate with AI" button
const runGenerator = (body) =>
  new Promise((resolve, reject) => {
    const res = {
      code: 200,
      status(c) { this.code = c; return this; },
      json(data) { this.code >= 400 ? reject(new Error(data.error)) : resolve(data); }
    };
    generateBlog({ body }, res);
  });

async function createDraftBlog() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  console.log(`[cron] Generating blog about: ${topic}`);
  try {
    const ai = await runGenerator({ topic, tone: 'professional', length: 'medium', withImage: true });
    await Blog.create({
      title: ai.title,
      content: ai.content,
      tags: ai.tags,
      conclusion: ai.conclusion,
      coverImage: ai.coverImage,
      status: 'Draft' // admin reviews it before publishing
    });
    console.log(`[cron] Draft saved: "${ai.title}"`);
  } catch (err) {
    console.error('[cron] Auto blog failed:', err.message);
  }
}

if (process.env.AUTO_BLOG_ENABLED === 'true') {
  // "0 9 * * *" = every day at 9:00 AM
  const schedule = process.env.AUTO_BLOG_SCHEDULE || '0 9 * * *';

  if (cron.validate(schedule)) {
    cron.schedule(schedule, createDraftBlog, { timezone: 'Asia/Kolkata' });
    console.log(`[cron] Auto blog is ON. Schedule: ${schedule}`);
  } else {
    console.error(`[cron] Invalid AUTO_BLOG_SCHEDULE: "${schedule}"`);
  }
} else {
  console.log('[cron] Auto blog is OFF (add AUTO_BLOG_ENABLED=true to .env to turn it on)');
}