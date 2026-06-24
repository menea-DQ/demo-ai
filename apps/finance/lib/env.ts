// Configurazione SPECIFICA dell'app finance (la sicurezza è in @donq/security).
function str(name: string, def = ""): string {
  return process.env[name] ?? def;
}

export const env = {
  appUrl: str("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  contactCtaUrl: str("NEXT_PUBLIC_CONTACT_URL", "https://donq.io/contacts"),
};
