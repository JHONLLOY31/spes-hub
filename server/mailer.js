// SPES Hub Email Service — supports Resend API, Gmail App Password, or any SMTP server.
// Configure via environment variables (locally in server/.env, or in Vercel Project Settings -> Environment Variables):
//   Option 1 (Easiest - Gmail): GMAIL_USER + GMAIL_APP_PASSWORD
//   Option 2 (Resend API):      RESEND_API_KEY + EMAIL_FROM
//   Option 3 (Custom SMTP):     SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS + EMAIL_FROM

let _transporter = null;

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getConfig() {
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').trim();
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const fromEnv = (process.env.EMAIL_FROM || '').trim();

  if (resendKey) {
    return { kind: 'resend', apiKey: resendKey, from: fromEnv || 'SPES Hub <onboarding@resend.dev>' };
  }
  if (gmailUser && gmailPass) {
    return {
      kind: 'smtp',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: gmailUser,
      pass: gmailPass,
      from: fromEnv || `SPES Hub <${gmailUser}>`
    };
  }
  if (smtpHost && smtpUser && smtpPass) {
    return {
      kind: 'smtp',
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465 || process.env.SMTP_SECURE === '1',
      user: smtpUser,
      pass: smtpPass,
      from: fromEnv || `SPES Hub <${smtpUser}>`
    };
  }
  return null;
}

function isMailerConfigured() {
  return !!getConfig();
}

function getTransporter(cfg) {
  if (_transporter) return _transporter;
  const nodemailer = require('nodemailer');
  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });
  return _transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const cfg = getConfig();
  if (!cfg) return { ok: false, skipped: true, reason: 'not_configured' };
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, skipped: true, reason: 'invalid_to' };

  try {
    if (cfg.kind === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: cfg.from, to: [to], subject, html, text })
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error('Resend email error:', res.status, err);
        return { ok: false, error: `Resend error (${res.status})` };
      }
      return { ok: true };
    }

    const tx = getTransporter(cfg);
    await tx.sendMail({ from: cfg.from, to, subject, html, text });
    return { ok: true };
  } catch (e) {
    console.error('Email send error:', e && e.message ? e.message : e);
    return { ok: false, error: e && e.message ? e.message : 'Email send failed' };
  }
}

function layout({ title, badge, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  const btn = ctaLabel && ctaUrl
    ? `<div style="margin:24px 0 8px"><a href="${escHtml(ctaUrl)}" style="display:inline-block;background:#facc15;color:#111827;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">${escHtml(ctaLabel)}</a></div>
       <p style="margin:8px 0 0;font-size:12px;color:#6b7280;word-break:break-all">If the button doesn't work, copy and open this link:<br><a href="${escHtml(ctaUrl)}" style="color:#2563eb">${escHtml(ctaUrl)}</a></p>`
    : '';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 18px rgba(0,0,0,.06)">
        <tr><td style="background:#111827;padding:22px 26px;border-bottom:4px solid #facc15">
          <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.3px">SPES<span style="color:#facc15">Hub</span></div>
          <div style="font-size:12px;color:#d1d5db;margin-top:2px">Special Program for Employment of Students · Davao Oriental Provincial Capitol</div>
        </td></tr>
        <tr><td style="padding:26px">
          ${badge ? `<span style="display:inline-block;background:#fef9c3;color:#854d0e;border:1px solid #fde047;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">${escHtml(badge)}</span>` : ''}
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#111827">${escHtml(title)}</h1>
          <div style="font-size:14px;line-height:1.65;color:#374151">${bodyHtml}</div>
          ${btn}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 26px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
          ${escHtml(footerNote || 'This is an automated message from SPES Hub. Please do not reply directly to this email.')}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendVerificationEmail({ to, name, spesId, verifyUrl }) {
  const html = layout({
    badge: 'Email Verification',
    title: 'Verify your SPES Hub email address',
    bodyHtml: `<p>Hi <strong>${escHtml(name)}</strong>,</p>
      <p>Thank you for registering on <strong>SPES Hub</strong>! Your assigned SPES ID is <strong>${escHtml(spesId)}</strong>.</p>
      <p>Please click the button below to confirm your email address. After verifying your email, wait for the SPES Administrator to approve your account before logging in.</p>`,
    ctaLabel: 'Verify My Email',
    ctaUrl: verifyUrl
  });
  return sendEmail({
    to,
    subject: 'Verify your SPES Hub email address',
    html,
    text: `Hi ${name},\n\nThank you for registering on SPES Hub (SPES ID: ${spesId}).\nPlease verify your email using this link:\n${verifyUrl}\n\nAfter verifying, wait for Administrator approval before logging in.`
  });
}

async function sendPasswordResetCodeEmail({ to, name, code }) {
  const html = layout({
    badge: 'Password Reset Code',
    title: 'Your SPES Hub verification code',
    bodyHtml: `<p>Hi <strong>${escHtml(name || 'SPES Beneficiary')}</strong>,</p>
      <p>Use the 6-digit verification code below in SPES Hub to reset your password. This code expires in <strong>10 minutes</strong>.</p>
      <div style="margin:20px 0;padding:18px;background:#111827;border-radius:14px;text-align:center;border:2px solid #facc15">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#d1d5db;margin-bottom:6px">6-Digit Auth Code</div>
        <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#facc15;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escHtml(code)}</div>
      </div>
      <p style="color:#6b7280;font-size:13px">Never share this code with anyone. If you did not request a password reset, you can safely ignore this email.</p>`
  });
  return sendEmail({
    to,
    subject: `${code} is your SPES Hub password reset code`,
    html,
    text: `Hi ${name || 'SPES Beneficiary'},\n\nYour SPES Hub 6-digit password reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const html = layout({
    badge: 'Password Reset',
    title: 'Reset your SPES Hub password',
    bodyHtml: `<p>Hi <strong>${escHtml(name || 'SPES Beneficiary')}</strong>,</p>
      <p>We received a request to reset your SPES Hub password. Click the button below to authenticate and create a new password.</p>
      <p style="color:#6b7280;font-size:13px">If you did not request a password reset, you can safely ignore this email.</p>`,
    ctaLabel: 'Reset Password',
    ctaUrl: resetUrl
  });
  return sendEmail({
    to,
    subject: 'Reset your SPES Hub password',
    html,
    text: `Hi ${name || 'SPES Beneficiary'},\n\nReset your SPES Hub password using this link:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
  });
}

async function sendApprovalEmail({ to, name, spesId, batch, loginUrl }) {
  const html = layout({
    badge: 'Account Approved',
    title: 'Welcome to SPES Hub! Your account is approved',
    bodyHtml: `<p>Hi <strong>${escHtml(name)}</strong>,</p>
      <p>Great news! Your SPES Hub registration has been <strong>approved</strong> by the administrator.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin:14px 0">
        <div><strong>SPES ID:</strong> ${escHtml(spesId || '—')}</div>
        <div><strong>Batch:</strong> ${escHtml(batch || '—')}</div>
      </div>
      <p>You can now log in to record your daily attendance, submit journals, access your Attendance QR Pass, and join learning games.</p>`,
    ctaLabel: 'Log In to SPES Hub',
    ctaUrl: loginUrl
  });
  return sendEmail({
    to,
    subject: 'Your SPES Hub Account Has Been Approved!',
    html,
    text: `Hi ${name},\n\nYour SPES Hub account (SPES ID: ${spesId}, Batch: ${batch}) has been APPROVED! Log in here: ${loginUrl}`
  });
}

async function sendDeclinedEmail({ to, name, batch }) {
  const html = layout({
    badge: 'Registration Update',
    title: 'Update on your SPES Hub registration',
    bodyHtml: `<p>Hi <strong>${escHtml(name)}</strong>,</p>
      <p>Your SPES Hub registration for batch <strong>${escHtml(batch || '—')}</strong> was <strong>declined</strong> by the administrator.</p>
      <p>If you believe this was a mistake or need your application reconsidered, please contact your SPES / PESO Administrator directly.</p>`
  });
  return sendEmail({
    to,
    subject: 'Update on your SPES Hub Registration',
    html,
    text: `Hi ${name},\n\nYour SPES Hub registration for batch ${batch || ''} was declined by the administrator. Please contact your SPES Administrator if you need reconsideration.`
  });
}

async function sendAnnouncementEmails({ recipients, title, body, batchLabel, eventDate, portalUrl }) {
  const configured = isMailerConfigured();
  const list = (recipients || []).filter(r => r && r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  if (!configured || !list.length) {
    return { sent: 0, failed: 0, total: list.length, configured };
  }

  let sent = 0, failed = 0;
  const CHUNK = 8;
  for (let i = 0; i < list.length; i += CHUNK) {
    const slice = list.slice(i, i + CHUNK);
    const results = await Promise.allSettled(slice.map(r => {
      const html = layout({
        badge: `Announcement · ${batchLabel}`,
        title,
        bodyHtml: `<p>Hi <strong>${escHtml(r.name || 'SPES Beneficiary')}</strong>,</p>
          <p style="white-space:pre-line;background:#f9fafb;border-left:4px solid #facc15;padding:12px 16px;border-radius:8px;margin:14px 0">${escHtml(body)}</p>
          ${eventDate ? `<p><strong>Event Date:</strong> ${escHtml(eventDate)}</p>` : ''}`,
        ctaLabel: 'Open SPES Hub',
        ctaUrl: portalUrl
      });
      return sendEmail({
        to: r.email,
        subject: `[SPES Hub · ${batchLabel}] ${title}`,
        html,
        text: `Hi ${r.name || 'SPES Beneficiary'},\n\n[${batchLabel}] ${title}\n\n${body}${eventDate ? `\n\nEvent Date: ${eventDate}` : ''}\n\nOpen SPES Hub: ${portalUrl}`
      });
    }));
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value && res.value.ok) sent++;
      else failed++;
    }
  }
  return { sent, failed, total: list.length, configured };
}

module.exports = {
  isMailerConfigured,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetCodeEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendDeclinedEmail,
  sendAnnouncementEmails
};
