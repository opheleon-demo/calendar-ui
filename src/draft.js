export const draftKey = username => `calendar-draft:${username}`;
export function readDraft(username) {
  try { return JSON.parse(sessionStorage.getItem(draftKey(username))); }
  catch { return null; }
}
