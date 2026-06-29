/**
 * Research email anonymization salt — must be set in Base44 secrets.
 * Never hardcode a default; that would let anyone reverse anonymized IDs.
 */
export function getResearchSalt(): string {
  const salt = Deno.env.get("RESEARCH_SALT")?.trim();
  if (!salt) {
    throw new Error(
      "RESEARCH_SALT is not configured. Set it in Base44 secrets: base44 secrets set RESEARCH_SALT=<random-string>",
    );
  }
  return salt;
}

export function hashEmailToAnonId(email: string, salt: string) {
  const str = `${salt}:${String(email ?? "").toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}
