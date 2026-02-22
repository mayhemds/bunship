/**
 * Email worker
 * Processes email jobs using Resend
 */
import { Worker, Job } from "bullmq";
import { Resend } from "resend";
import IORedis from "ioredis";
import type { EmailJobData } from "../queue";
import { appConfig } from "@bunship/config";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required for email worker");
}
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Process email job
 */
async function processEmailJob(job: Job<EmailJobData>) {
  const { to, from, subject, html, text, templateId, templateData, replyTo, cc, bcc, tags } =
    job.data;

  try {
    console.log(`Processing email job ${job.id} to ${to}`);

    // Prepare email data
    const emailData: any = {
      from: from ?? `${appConfig.company.name} <${appConfig.company.email}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      reply_to: replyTo,
      cc,
      bcc,
      tags,
    };

    // Use template or raw content
    if (templateId && templateData) {
      // If using email templates with Resend React
      // This would require setting up email templates
      emailData.html = html; // For now, still use HTML
      emailData.text = text;
    } else {
      emailData.html = html;
      emailData.text = text;
    }

    // Send email via Resend
    const result = await resend.emails.send(emailData);

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    console.log(`Email sent successfully: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`Failed to send email (job ${job.id}):`, error);
    throw error; // Let BullMQ handle retries
  }
}

/**
 * Email worker instance
 */
export const emailWorker = new Worker<EmailJobData>("email", processEmailJob, {
  connection,
  concurrency: 5, // Process 5 emails concurrently
  limiter: {
    max: parseInt(process.env.RESEND_RATE_LIMIT || "10", 10), // Default 10/sec (Resend free tier)
    duration: 1000,
  },
});

/**
 * Worker event handlers
 */
emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
});

emailWorker.on("error", (err) => {
  console.error("Email worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing email worker...");
  await emailWorker.close();
  await connection.quit();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing email worker...");
  await emailWorker.close();
  await connection.quit();
});
