// Centralized public app URL used in all outbound emails.
// Override via PUBLIC_APP_URL env var if the production domain ever changes.
export const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://memorydrawer.app";
