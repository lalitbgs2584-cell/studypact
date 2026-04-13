type MonitoringMetadata = Record<string, unknown>;

function sanitizeLog(value: string) {
  return value.replace(/[\r\n\t]/g, " ").slice(0, 500);
}

function resolveWebhookUrl(): string | null {
  const raw = process.env.ERROR_WEBHOOK_URL;
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

const WEBHOOK_URL: string | null = resolveWebhookUrl();

export async function reportServerError(
  scope: string,
  error: unknown,
  metadata: MonitoringMetadata = {},
) {
  const message = error instanceof Error ? error.message : "Unknown server error";

  console.error(`[monitoring] ${sanitizeLog(scope)}`, {
    message: sanitizeLog(message),
    metadata,
    occurredAt: new Date().toISOString(),
  });

  if (!WEBHOOK_URL) return;

  const payload = {
    scope: sanitizeLog(scope),
    message: sanitizeLog(message),
    stack: error instanceof Error ? (error.stack ?? null) : null,
    metadata,
    occurredAt: new Date().toISOString(),
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (reportError) {
    console.error("[monitoring] failed to deliver webhook", { scope: sanitizeLog(scope), reportError });
  }
}
