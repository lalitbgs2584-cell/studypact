type MonitoringMetadata = Record<string, unknown>;

export async function reportServerError(
  scope: string,
  error: unknown,
  metadata: MonitoringMetadata = {},
) {
  const payload = {
    scope,
    message: error instanceof Error ? error.message : "Unknown server error",
    stack: error instanceof Error ? error.stack : null,
    metadata,
    occurredAt: new Date().toISOString(),
  };

  console.error(`[monitoring] ${scope}`, payload);

  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (reportError) {
    console.error("[monitoring] failed to deliver webhook", {
      scope,
      reportError,
    });
  }
}
