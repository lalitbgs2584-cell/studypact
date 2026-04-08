type ResetPasswordEmailInput = {
  email: string;
  name?: string | null;
  url: string;
};

function buildResetPasswordEmail({ name, url }: ResetPasswordEmailInput) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi there,";

  return {
    subject: "Reset your StudyPact password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">StudyPact password reset</h1>
        <p style="margin: 0 0 16px;">${greeting}</p>
        <p style="margin: 0 0 16px;">
          We received a request to reset your password. Use the button below to choose a new one.
        </p>
        <p style="margin: 24px 0;">
          <a
            href="${url}"
            style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;"
          >
            Reset password
          </a>
        </p>
        <p style="margin: 0 0 16px; color: #4b5563;">
          If you did not request this, you can safely ignore this email.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If the button does not work, open this link directly:<br />
          <a href="${url}" style="color: #2563eb;">${url}</a>
        </p>
      </div>
    `,
  };
}

export async function sendResetPasswordEmail(input: ResetPasswordEmailInput) {
  const from = process.env.AUTH_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const email = buildResetPasswordEmail(input);

  if (!from || !resendApiKey) {
    console.info("Password reset email fallback", {
      email: input.email,
      resetUrl: input.url,
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.email,
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send password reset email: ${details}`);
  }
}
