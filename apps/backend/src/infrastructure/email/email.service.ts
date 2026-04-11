import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT', '587')),
        secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: { user, pass },
      });
      this.logger.log('Email service configured with SMTP');
    } else {
      this.logger.warn('SMTP not configured — emails will be logged to console only');
    }
  }

  async send(template: EmailTemplate): Promise<boolean> {
    if (!this.transporter) {
      // Dev mode: log email to console instead of sending
      this.logger.log(`[EMAIL DEV MODE] To: ${template.to} | Subject: ${template.subject}`);
      this.logger.log(`[EMAIL DEV MODE] HTML preview (first 200 chars): ${template.html.substring(0, 200)}...`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', '"PredictEngine" <noreply@predictengine.io>'),
        to: template.to,
        subject: template.subject,
        html: template.html,
      });
      this.logger.log(`Email sent to ${template.to}: ${template.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${template.to}: ${error.message}`);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Welcome to PredictEngine 🎯',
      html: this.renderWelcomeTemplate(name, email),
    });
  }

  async sendLoginAlertEmail(email: string, name: string, loginTime: string, ipAddress: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'New Login to Your PredictEngine Account',
      html: this.renderLoginAlertTemplate(name, email, loginTime, ipAddress),
    });
  }

  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Reset Your PredictEngine Password',
      html: this.renderPasswordResetTemplate(name, email, resetUrl),
    });
  }

  // ─── Professional HTML Email Templates ──────────────────

  private renderWelcomeTemplate(name: string, email: string): string {
    const displayName = name || email.split('@')[0];
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to PredictEngine</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#047857,#10b981);padding:40px 48px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.02em;">🎯 PredictEngine</h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:40px 48px 32px;">
    <h2 style="margin:0 0 16px;color:#09090b;font-size:22px;font-weight:700;">Welcome, ${displayName}!</h2>
    <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">Your account has been created successfully. You're now part of a community of smart sports predictors.</p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">Our AI-powered prediction engine uses <strong>ELO ratings</strong>, <strong>form analysis</strong>, and <strong>market odds ensemble models</strong> to deliver accurate predictions across 80+ sports.</p>
    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#047857,#10b981);border-radius:8px;text-align:center;">
      <a href="https://predictengine.io/dashboard" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Go to Dashboard →</a>
    </td></tr></table>
  </td></tr>
  <!-- Features -->
  <tr><td style="padding:0 48px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:#f9fafb;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:24px;">📊</div>
          <p style="margin:8px 0 0;color:#09090b;font-size:13px;font-weight:600;">80+ Sports</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#f9fafb;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:24px;">🤖</div>
          <p style="margin:8px 0 0;color:#09090b;font-size:13px;font-weight:600;">AI Models</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#f9fafb;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:24px;">📈</div>
          <p style="margin:8px 0 0;color:#09090b;font-size:13px;font-weight:600;">Live Tracking</p>
        </td>
      </tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:0 48px 40px;border-top:1px solid #e4e4e7;">
    <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">If you didn't create this account, please ignore this email.</p>
    <p style="margin:8px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} PredictEngine. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  private renderLoginAlertTemplate(name: string, email: string, loginTime: string, ipAddress: string): string {
    const displayName = name || email.split('@')[0];
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:#09090b;padding:32px 48px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">🔒 Security Alert</h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px 48px 24px;">
    <h2 style="margin:0 0 16px;color:#09090b;font-size:18px;font-weight:700;">New Login Detected</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">Hi ${displayName}, we noticed a new login to your PredictEngine account.</p>
    <!-- Details Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#f9fafb;padding:12px 16px;color:#52525b;font-size:13px;font-weight:600;">Login Details</td></tr>
      <tr><td style="padding:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;color:#71717a;font-size:14px;width:100px;">Email</td><td style="padding:6px 0;color:#09090b;font-size:14px;font-weight:500;">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Time</td><td style="padding:6px 0;color:#09090b;font-size:14px;font-weight:500;">${loginTime}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:14px;">IP Address</td><td style="padding:6px 0;color:#09090b;font-size:14px;font-weight:500;">${ipAddress}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <!-- Warning -->
  <tr><td style="padding:0 48px 24px;">
    <p style="margin:0;color:#52525b;font-size:14px;line-height:1.6;">If this was you, no action is needed. If you don't recognize this activity, please <a href="mailto:support@predictengine.io" style="color:#059669;font-weight:600;">contact support</a> immediately.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:0 48px 32px;border-top:1px solid #e4e4e7;">
    <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">This is an automated security notification. Please do not reply directly.</p>
    <p style="margin:8px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} PredictEngine. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  private renderPasswordResetTemplate(name: string, email: string, resetUrl: string): string {
    const displayName = name || email.split('@')[0];
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:#09090b;padding:32px 48px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">🔑 Password Reset</h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px 48px 24px;">
    <h2 style="margin:0 0 16px;color:#09090b;font-size:18px;font-weight:700;">Reset Your Password</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">Hi ${displayName}, we received a request to reset the password for your PredictEngine account. Click the button below to set a new password.</p>
    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#047857,#10b981);border-radius:8px;text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Reset Password</a>
    </td></tr></table>
    <p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.5;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:0 48px 32px;border-top:1px solid #e4e4e7;">
    <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">If you're having trouble with the button, copy and paste this URL into your browser:</p>
    <p style="margin:8px 0 0;color:#059669;font-size:12px;text-align:center;word-break:break-all;">${resetUrl}</p>
    <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;text-align:center;">© ${new Date().getFullYear()} PredictEngine. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }
}
