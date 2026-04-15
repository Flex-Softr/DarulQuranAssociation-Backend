import { config } from '../../../config';
import { logger } from './logger';
import nodemailer from 'nodemailer';

/**
 * Email service utility
 * Uses nodemailer with SMTP configuration
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get nodemailer transporter
 */
const getTransporter = () => {
  // If SMTP is not configured, return null (will log instead)
  if (!config.smtp.host || !config.smtp.email || !config.smtp.password) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465, // true for 465, false for other ports
    requireTLS: config.smtp.port === 587, // Require TLS for port 587
    auth: {
      user: config.smtp.email,
      pass: config.smtp.password,
    },
    tls: {
      // Enforce TLS certificate validation
      rejectUnauthorized: true,
    },
  });
};

/**
 * Send email
 * Uses SMTP if configured, otherwise logs to console
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const { to, subject, html, text } = options;

  const transporter = getTransporter();

  if (!transporter) {
    // SMTP not configured, log email to console
    logger.info('📧 Email would be sent (SMTP not configured):', {
      to,
      subject,
    });
  //  console.log('\n=== EMAIL (SMTP Not Configured) ===');
  //  console.log(`To: ${to}`);
  //  console.log(`Subject: ${subject}`);
  //  console.log(`Body:\n${text || html}`);
  //  console.log('====================================\n');
    return;
  }

  try {
    // Send email via SMTP
    const info = await transporter.sendMail({
      from: `"DarulQuran" <${config.smtp.email}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
    });

    logger.info('✅ Email sent successfully:', {
      to,
      subject,
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error('❌ Failed to send email:', {
      to,
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Send password email to new user
 */
export const sendPasswordEmail = async (
  email: string,
  password: string,
  fullName?: string
): Promise<void> => {
  const subject = 'Welcome to DarulQuran - Your Account Credentials';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .password-box { background-color: #fff; border: 2px solid #4CAF50; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to DarulQuran</h1>
        </div>
        <div class="content">
          <p>Dear ${fullName || 'User'},</p>
          <p>Thank you for your donation! An account has been created for you.</p>
          <p>Your login credentials are:</p>
          <div class="password-box">
            Email: ${email}<br>
            Password: ${password}
          </div>
          <p><strong>Please change your password after logging in for security.</strong></p>
          <p>You can now log in to your account to track your donations and manage your profile.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>DarulQuran Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to DarulQuran

Dear ${fullName || 'User'},

Thank you for your donation! An account has been created for you.

Your login credentials are:
Email: ${email}
Password: ${password}

Please change your password after logging in for security.

You can now log in to your account to track your donations and manage your profile.

If you have any questions, please contact our support team.

Best regards,
DarulQuran Team

---
This is an automated email. Please do not reply to this message.
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};

/**
 * Send member application status change notification email
 */
export const sendMemberApplicationStatusEmail = async (
  email: string,
  applicantName: string,
  statusType: 'application' | 'payment',
  status: string,
  applicationDetails?: {
    type?: string;
    amount?: number;
    transactionId?: string;
  }
): Promise<void> => {
  const statusLabels: Record<string, string> = {
    // Application statuses
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    // Payment statuses
    pending: 'Pending',
    completed: 'Completed',
    pending_verification: 'Pending Verification',
    failed: 'Failed',
    cancel: 'Cancelled',
  };

  const statusLabel = statusLabels[status] || status;
  const isApplicationStatus = statusType === 'application';
  const subject = isApplicationStatus
    ? `DarulQuran - Application Status Update: ${statusLabel}`
    : `DarulQuran - Payment Status Update: ${statusLabel}`;

  // Determine status color and message
  let statusColor = '#4CAF50'; // Default green
  let statusMessage = '';
  let additionalInfo = '';

  if (isApplicationStatus) {
    switch (status) {
      case 'approved':
        statusColor = '#4CAF50';
        statusMessage = 'Congratulations! Your membership application has been approved.';
        additionalInfo = 'We are delighted to welcome you as a member of DarulQuran.';
        break;
      case 'rejected':
        statusColor = '#f44336';
        statusMessage = 'Your membership application status has been rejected.';
        additionalInfo = 'If you have any questions or concerns, please contact our support team.';
        break;
      case 'pending_approval':
        statusColor = '#FF9800';
        statusMessage = 'Your application is currently under review.';
        additionalInfo = 'We will notify you once the review process is complete.';
        break;
    }
  } else {
    switch (status) {
      case 'completed':
        statusColor = '#4CAF50';
        statusMessage = 'Your payment has been successfully processed.';
        additionalInfo = 'Thank you for your payment. Your application is now being reviewed.';
        break;
      case 'pending_verification':
        statusColor = '#FF9800';
        statusMessage = 'Your payment is pending verification.';
        additionalInfo = 'We are reviewing your payment documents. You will be notified once verified.';
        break;
      case 'failed':
        statusColor = '#f44336';
        statusMessage = 'Your payment could not be processed.';
        additionalInfo = 'Please contact our support team for assistance or try again.';
        break;
      case 'cancel':
        statusColor = '#f44336';
        statusMessage = 'Your payment has been cancelled.';
        additionalInfo = 'If this was unintentional, please contact our support team.';
        break;
      case 'pending':
        statusColor = '#FF9800';
        statusMessage = 'Your payment is pending.';
        additionalInfo = 'Please complete your payment to proceed with the application.';
        break;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .status-box { background-color: #fff; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; }
        .status-label { color: ${statusColor}; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .details-box { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .details-box p { margin: 8px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>DarulQuran</h1>
        </div>
        <div class="content">
          <p>Dear ${applicantName},</p>
          <p>${statusMessage}</p>
          <div class="status-box">
            <div class="status-label">Status: ${statusLabel}</div>
            <p>${additionalInfo}</p>
          </div>
          ${applicationDetails ? `
          <div class="details-box">
            <h3 style="margin-top: 0;">Application Details:</h3>
            ${applicationDetails.type ? `<p><strong>Member Type:</strong> ${applicationDetails.type === 'lifetime' ? 'Lifetime Member' : 'Donor'}</p>` : ''}
            ${applicationDetails.amount ? `<p><strong>Amount:</strong> ৳${applicationDetails.amount.toLocaleString()}</p>` : ''}
            ${applicationDetails.transactionId ? `<p><strong>Transaction ID:</strong> ${applicationDetails.transactionId}</p>` : ''}
          </div>
          ` : ''}
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>DarulQuran Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
DarulQuran - ${isApplicationStatus ? 'Application' : 'Payment'} Status Update

Dear ${applicantName},

${statusMessage}

Status: ${statusLabel}

${additionalInfo}

${applicationDetails ? `
Application Details:
${applicationDetails.type ? `Member Type: ${applicationDetails.type === 'lifetime' ? 'Lifetime Member' : 'Donor'}` : ''}
${applicationDetails.amount ? `Amount: ৳${applicationDetails.amount.toLocaleString()}` : ''}
${applicationDetails.transactionId ? `Transaction ID: ${applicationDetails.transactionId}` : ''}
` : ''}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
DarulQuran Team

---
This is an automated email. Please do not reply to this message.
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};

