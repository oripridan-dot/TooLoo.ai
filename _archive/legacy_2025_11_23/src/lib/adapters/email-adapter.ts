/**
 * Production Email Adapter – Supports SendGrid, Mailgun, and graceful fallbacks
 * Environment variables:
 * - EMAIL_PROVIDER: 'sendgrid' | 'mailgun' | 'mock' (default: 'mock')
 * - SENDGRID_API_KEY: SendGrid API key
 * - MAILGUN_API_KEY: Mailgun API key
 * - MAILGUN_DOMAIN: Mailgun domain (e.g., mg.example.com)
 */

export class EmailAdapter {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'mock';
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
    this.mailgunApiKey = process.env.MAILGUN_API_KEY;
    this.mailgunDomain = process.env.MAILGUN_DOMAIN;
    this.emailQueue = [];
    this.isProcessing = false;
    this.retryLimit = 3;
  }

  async execute(action, params, tokenData) {
    switch (action) {
    case 'send-email':
      return this.sendEmail(tokenData, params);
    case 'queue-status':
      return { queueLength: this.emailQueue.length, processing: this.isProcessing };
    case 'retry-failed':
      return this.retryFailedEmails();
    default:
      throw new Error(`Unknown action: ${action}`);
    }
  }

  async sendEmail(config, { to, subject, text, html, from, replyTo, attachments }) {
    if (!to || !subject || (!text && !html)) {
      throw new Error('to, subject, and (text or html) required');
    }

    const emailMessage = {
      to,
      subject,
      text,
      html,
      from: from || process.env.EMAIL_FROM || 'noreply@tooloo.ai',
      replyTo: replyTo || process.env.EMAIL_REPLY_TO,
      attachments,
      timestamp: new Date().toISOString(),
      retries: 0,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      const result = await this.attemptSend(emailMessage);
      if (result.ok) {
        return result;
      } else {
        this.emailQueue.push(emailMessage);
        this.processQueue();
        return {
          ok: false,
          queued: true,
          messageId: emailMessage.messageId,
          reason: result.reason,
          willRetry: true
        };
      }
    } catch (e) {
      emailMessage.lastError = e.message;
      this.emailQueue.push(emailMessage);
      this.processQueue();
      return {
        ok: false,
        queued: true,
        messageId: emailMessage.messageId,
        error: e.message,
        willRetry: true
      };
    }
  }

  async attemptSend(emailMessage) {
    try {
      switch (this.provider) {
      case 'sendgrid':
        return await this.sendViaSendGrid(emailMessage);
      case 'mailgun':
        return await this.sendViaMailgun(emailMessage);
      case 'mock':
      default:
        return this.sendViaLog(emailMessage);
      }
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  async sendViaSendGrid(emailMessage) {
    if (!this.sendgridApiKey) {
      console.warn('SENDGRID_API_KEY not configured, falling back to mock');
      return this.sendViaLog(emailMessage);
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: emailMessage.to }],
            subject: emailMessage.subject
          }],
          from: { email: emailMessage.from },
          content: [
            { type: 'text/plain', value: emailMessage.text || '' },
            emailMessage.html && { type: 'text/html', value: emailMessage.html }
          ].filter(Boolean)
        })
      });

      if (response.ok) {
        return {
          ok: true,
          messageId: emailMessage.messageId,
          provider: 'sendgrid',
          timestamp: new Date().toISOString()
        };
      } else {
        const error = await response.text();
        return { ok: false, reason: `SendGrid ${response.status}: ${error}` };
      }
    } catch (error) {
      return { ok: false, reason: `SendGrid fetch: ${error.message}` };
    }
  }

  async sendViaMailgun(emailMessage) {
    if (!this.mailgunApiKey || !this.mailgunDomain) {
      console.warn('MAILGUN config missing, falling back to mock');
      return this.sendViaLog(emailMessage);
    }

    try {
      const formData = new FormData();
      formData.append('from', emailMessage.from);
      formData.append('to', emailMessage.to);
      formData.append('subject', emailMessage.subject);
      formData.append('text', emailMessage.text || '');
      if (emailMessage.html) formData.append('html', emailMessage.html);
      if (emailMessage.replyTo) formData.append('h:Reply-To', emailMessage.replyTo);

      const response = await fetch(
        `https://api.mailgun.net/v3/${this.mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          ok: true,
          messageId: emailMessage.messageId,
          mailgunId: data.id,
          provider: 'mailgun',
          timestamp: new Date().toISOString()
        };
      } else {
        const error = await response.json();
        return { ok: false, reason: `Mailgun ${response.status}: ${error.message}` };
      }
    } catch (error) {
      return { ok: false, reason: `Mailgun fetch: ${error.message}` };
    }
  }

  sendViaLog(emailMessage) {
    console.log(`📧 [EMAIL] To: ${emailMessage.to} | Subject: ${emailMessage.subject} | ID: ${emailMessage.messageId}`);
    return {
      ok: true,
      messageId: emailMessage.messageId,
      provider: 'mock',
      timestamp: new Date().toISOString(),
      note: 'Logged only (configure EMAIL_PROVIDER for production)'
    };
  }

  async processQueue() {
    if (this.isProcessing || this.emailQueue.length === 0) return;

    this.isProcessing = true;
    const maxConcurrent = 5;
    const batchDelay = 1000;

    try {
      while (this.emailQueue.length > 0) {
        const batch = this.emailQueue.splice(0, maxConcurrent);
        const results = await Promise.all(
          batch.map(msg => this.retryEmailMessage(msg))
        );
        this.emailQueue.unshift(
          ...results.filter(r => !r.ok).map(r => r.message)
        );
        if (this.emailQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async retryEmailMessage(emailMessage) {
    emailMessage.retries = (emailMessage.retries || 0) + 1;
    if (emailMessage.retries > this.retryLimit) {
      console.error(`❌ Email ${emailMessage.messageId} exceeded retry limit`);
      return { ok: true, message: null };
    }
    const delay = Math.pow(5, emailMessage.retries) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    const result = await this.attemptSend(emailMessage);
    if (!result.ok) emailMessage.lastError = result.reason;
    return { ok: result.ok, message: emailMessage };
  }

  async retryFailedEmails() {
    const failedCount = this.emailQueue.length;
    if (failedCount === 0) return { ok: true, retried: 0 };
    await this.processQueue();
    return { ok: true, retried: failedCount, remaining: this.emailQueue.length };
  }
}

export default new EmailAdapter();
