import { sendEmail, verifyTransporter, isValidEmail } from '../services/emailService.js';
import { emailQueue } from '../queues/emailQueue.js';

/**
 * Controller to handle sending email requests
 * Endpoint: POST /api/email/send
 */
export const handleSendEmail = async (req, res) => {
  try {
    const { to, subject, text, message, html, asyncQueue } = req.body;
    const bodyContent = text || message || '';

    // 1. Validate Recipient
    if (!to || typeof to !== 'string' || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required.'
      });
    }

    const recipient = to.trim();
    if (!isValidEmail(recipient)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address.'
      });
    }

    // 2. Validate Subject
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email subject is required.'
      });
    }

    const trimmedSubject = subject.trim();
    if (trimmedSubject.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Email subject must not exceed 200 characters.'
      });
    }

    // 3. Validate Body / Content
    if (!bodyContent.trim() && !html) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required.'
      });
    }

    // Option for background queue dispatch
    if (asyncQueue) {
      const task = await emailQueue.enqueue({
        to: recipient,
        subject: trimmedSubject,
        text: bodyContent.trim(),
        html: html || null
      });

      return res.status(202).json({
        success: true,
        message: 'Email accepted for asynchronous delivery queue.',
        taskId: task.id,
        queueStatus: emailQueue.getStats()
      });
    }

    // Synchronous dispatch
    const result = await sendEmail({
      to: recipient,
      subject: trimmedSubject,
      text: bodyContent.trim(),
      html: html || null
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send email'
      });
    }
  } catch (error) {
    console.error('[Email Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email: ' + error.message
    });
  }
};

/**
 * Controller to verify transporter connectivity
 * Endpoint: GET /api/email/status
 */
export const handleVerifyEmailStatus = async (req, res) => {
  try {
    const status = await verifyTransporter();
    return res.json({
      success: status.ready,
      message: status.message,
      queue: emailQueue.getStats()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email transporter status'
    });
  }
};

export default {
  handleSendEmail,
  handleVerifyEmailStatus
};
