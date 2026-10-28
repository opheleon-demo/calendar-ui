// Random key the API uses to recognise a repeated create of the same event.
export function newIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // randomUUID needs a secure context; fall back for plain-HTTP deployments.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
