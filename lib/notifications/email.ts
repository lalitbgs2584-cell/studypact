type BaseEmailInput = {
  email: string;
  subject: string;
  html: string;
};

type PreDeadlineNudgeEmailInput = {
  email: string;
  name?: string | null;
  groupName: string;
  dashboardUrl: string;
};

type FlaggedSubmissionEmailInput = {
  email: string;
  name?: string | null;
  groupName: string;
  groupUrl: string;
};

async function sendEmail(input: BaseEmailInput) {
  const from = process.env.AUTH_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!from || !resendApiKey) {
    console.info("Email fallback", {
      to: input.email,
      subject: input.subject,
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
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send notification email: ${details}`);
  }
}

function buildGreeting(name?: string | null) {
  return name?.trim() ? `Hi ${name.trim()},` : "Hi there,";
}

export async function sendPreDeadlineNudgeEmail(input: PreDeadlineNudgeEmailInput) {
  await sendEmail({
    email: input.email,
    subject: `StudyPact reminder: ${input.groupName} closes soon`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Two-hour check-in reminder</h1>
        <p style="margin: 0 0 16px;">${buildGreeting(input.name)}</p>
        <p style="margin: 0 0 16px;">
          Your <strong>${input.groupName}</strong> deadline is coming up, and we still don&apos;t have an end proof on file for today.
        </p>
        <p style="margin: 24px 0;">
          <a
            href="${input.dashboardUrl}"
            style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;"
          >
            Finish today&apos;s check-in
          </a>
        </p>
        <p style="margin: 0; color: #4b5563;">
          Upload your end proof and reflection before the daily cutoff to protect your streak and points.
        </p>
      </div>
    `,
  });
}

export async function sendFlaggedSubmissionEmail(input: FlaggedSubmissionEmailInput) {
  await sendEmail({
    email: input.email,
    subject: `StudyPact alert: your proof was flagged in ${input.groupName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">A peer flagged your proof</h1>
        <p style="margin: 0 0 16px;">${buildGreeting(input.name)}</p>
        <p style="margin: 0 0 16px;">
          Someone in <strong>${input.groupName}</strong> flagged your latest submission for review.
        </p>
        <p style="margin: 0 0 16px;">
          Open the group feed, check the review thread, and resubmit clearer proof if needed.
        </p>
        <p style="margin: 24px 0;">
          <a
            href="${input.groupUrl}"
            style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;"
          >
            Review your submission
          </a>
        </p>
      </div>
    `,
  });
}
