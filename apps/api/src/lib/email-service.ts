import { Resend } from 'resend';
import { EmailLog } from '@buyla/db';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@buyla.fr';
const SITE_NAME = process.env.SITE_NAME || 'Buyla';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  templateName: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, html, userId, templateName } = params;

  if (!process.env.RESEND_API_KEY) {
    console.warn('[email-service] RESEND_API_KEY is not set, skipping email send');
    return;
  }

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    await EmailLog.create({
      user_id: userId || null,
      template_name: templateName,
      to_email: to,
      subject,
      status: 'sent',
      resend_id: result.data?.id || null,
      sent_at: new Date(),
    });
  } catch (error) {
    console.error('Email send error:', error);

    await EmailLog.create({
      user_id: userId || null,
      template_name: templateName,
      to_email: to,
      subject,
      status: 'failed',
      resend_id: null,
      sent_at: new Date(),
    });
  }
}
