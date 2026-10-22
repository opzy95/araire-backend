async function sendEmail({ to, name, subject, textContent, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'Araire';

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo email request failed with status ${response.status}`);
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendWelcomeEmail(user) {
  const safeName = escapeHtml(user.name);
  return sendEmail({
    to: user.email,
    name: user.name,
    subject: 'Welcome to Araire',
    textContent: `Hello ${user.name}, welcome to Araire. Your account is ready.`,
    htmlContent: `<p>Hello ${safeName},</p><p>Welcome to Araire. Your account is ready.</p>`,
  });
}

async function sendPasswordResetEmail(user, code) {
  return sendEmail({
    to: user.email,
    name: user.name,
    subject: 'Your Araire password reset code',
    textContent: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, you can ignore this email.`,
    htmlContent: `<p>Your password reset code is:</p><p><strong>${code}</strong></p><p>It expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };