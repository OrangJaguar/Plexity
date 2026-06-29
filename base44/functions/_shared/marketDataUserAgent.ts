/**
 * Outbound User-Agent for third-party market data requests.
 * Override via MARKET_DATA_USER_AGENT in the function environment.
 */
export function marketDataUserAgent(): string {
  const configured = Deno.env.get("MARKET_DATA_USER_AGENT")?.trim();
  if (configured) return configured.slice(0, 256);

  const appName = Deno.env.get("APP_NAME")?.trim() || "Plexity";
  const appVersion = Deno.env.get("APP_VERSION")?.trim() || "1";
  const contact = Deno.env.get("APP_CONTACT_URL")?.trim() || "https://plexity.base44.app";

  return [
    "Mozilla/5.0",
    `(compatible; ${appName}/${appVersion}; +${contact})`,
  ].join(" ");
}
