import { randomUUID } from 'node:crypto';

const TRADE_DRAFT_TTL_MS = 15 * 60 * 1000; // 15 minutes
const tradeDrafts = new Map();

function cleanupExpiredDrafts() {
  const now = Date.now();
  for (const [id, draft] of tradeDrafts.entries()) {
    if (draft.expiresAt <= now) {
      tradeDrafts.delete(id);
    }
  }
}

setInterval(cleanupExpiredDrafts, TRADE_DRAFT_TTL_MS).unref?.();

/**
 * Creates a temporary trade draft and returns its identifier.
 *
 * @param {object} details - Trade details captured from the modal.
 * @returns {string} UUID referencing the draft payload.
 */
export function createTradeDraft(details) {
  const id = randomUUID();
  tradeDrafts.set(id, {
    ...details,
    expiresAt: Date.now() + TRADE_DRAFT_TTL_MS,
  });
  return id;
}

/**
 * Reads and deletes a stored draft entry.
 *
 * @param {string} id - Draft identifier returned by createTradeDraft.
 * @returns {object|null} The draft payload or null if missing/expired.
 */
export function consumeTradeDraft(id) {
  if (!id) return null;
  const draft = tradeDrafts.get(id);
  if (draft) {
    tradeDrafts.delete(id);
    return draft;
  }
  return null;
}
