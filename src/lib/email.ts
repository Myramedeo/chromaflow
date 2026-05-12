const RESEND_API_URL = "https://api.resend.com/emails";

function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return apiKey;
}

function getDefaultFromAddress() {
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    return `no-reply@${new URL(appUrl).hostname}`;
  } catch {
    return "no-reply@example.com";
  }
}

interface SendAssignmentNotificationEmailOptions {
  to: string;
  toName?: string | null;
  taskTitle: string;
  projectName: string;
  workspaceName?: string | null;
  assignerName?: string | null;
  taskUrl?: string;
}

export async function sendAssignmentNotificationEmail({
  to,
  toName,
  taskTitle,
  projectName,
  workspaceName,
  assignerName,
  taskUrl,
}: SendAssignmentNotificationEmailOptions) {
  const apiKey = getResendApiKey();
  const from = getDefaultFromAddress();
  const subject = `New task assigned: ${taskTitle}`;
  const appName = workspaceName ? `${workspaceName}` : "Chromaflow";

  const html = `
    <div style="font-family:system-ui, sans-serif; line-height:1.5; color:#111827;">
      <p>Hi ${toName ?? "there"},</p>
      <p>
        You were assigned a new task in <strong>${appName}</strong>.
      </p>
      <dl style="margin:1rem 0;">
        <div style="margin-bottom:.75rem;">
          <dt style="font-weight:600;">Task</dt>
          <dd>${taskTitle}</dd>
        </div>
        <div style="margin-bottom:.75rem;">
          <dt style="font-weight:600;">Project</dt>
          <dd>${projectName}</dd>
        </div>
        ${assignerName ? `<div style="margin-bottom:.75rem;"><dt style="font-weight:600;">Assigned by</dt><dd>${assignerName}</dd></div>` : ""}
      </dl>
      ${taskUrl ? `<p><a href="${taskUrl}" style="color:#2563eb;">View task</a></p>` : ""}
      <p>Thanks,<br/>The Chromaflow team</p>
    </div>
  `;

  const text = `Hi ${toName ?? "there"},\n\n` +
    `You were assigned a new task in ${appName}: ${taskTitle}\n` +
    `Project: ${projectName}\n` +
    `${assignerName ? `Assigned by: ${assignerName}\n` : ""}` +
    `${taskUrl ? `View the task: ${taskUrl}\n` : ""}` +
    `\nThanks,\nChromaflow\n`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${body}`);
  }
}
