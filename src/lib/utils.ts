import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a reviewer name for display.
 * - If full name with spaces: return first + last
 * - Else if email provided: use local-part and split on common separators to get first+last
 * - Else if opaque id (long alphanumeric): return `Usuário ${short}` where short is first 6 chars
 */
export function formatReviewerName(name?: string | null, email?: string | null): string {
  const fallbackPrefix = 'Usuário';

  if (!name && !email) return `${fallbackPrefix}`;

  const clean = (s: string) => s.trim();

  // Detect UUID-like strings (v4 or similar) or long hex hashes
  const isUUID = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
  const isLongHash = (s: string) => /^[0-9A-Za-z_-]{16,}$/.test(s);

  // Common placeholder mappings (if backend stored some defaults)
  const commonMap: Record<string, string> = {
    'anonymous': 'Usuário Anônimo',
    'guest': 'Usuário',
  };

  if (name) {
    const n = clean(name);
    if (!n) return `${fallbackPrefix}`;

    const lower = n.toLowerCase();
    if (commonMap[lower]) return commonMap[lower];

    // If name contains spaces, prefer First Last
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${capitalize(parts[0])} ${capitalize(parts[parts.length - 1])}`;
    }

    // If the name looks like a UUID or long hash, fallback to email or short id
    if (isUUID(n) || isLongHash(n)) {
      if (email) {
        return formatReviewerName(undefined, email);
      }
      return `${fallbackPrefix} ${n.slice(0, 6)}`;
    }

    // Otherwise return the name capitalized
    return capitalize(n);
  }

  if (email) {
    const local = clean(email.split('@')[0]);
    const tokens = local.split(/[._\-]+/).filter(Boolean);
    if (tokens.length >= 2) {
      return `${capitalize(tokens[0])} ${capitalize(tokens[tokens.length - 1])}`;
    }
    if (tokens.length === 1) {
      const t = tokens[0];
      if (isLongHash(t) || t.length > 12) return `${fallbackPrefix} ${t.slice(0, 6)}`;
      return capitalize(t);
    }
  }

  return `${fallbackPrefix}`;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
