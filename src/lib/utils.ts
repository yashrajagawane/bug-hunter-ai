/**
 * Shared utility functions used across multiple pages.
 * Centralises logic that was previously duplicated in Dashboard, Profile, and Leaderboard.
 */

/** Maps a user level to a human-readable rank title. */
export function getRankTitle(level: number): string {
  if (level >= 50) return 'Grand Master Detective';
  if (level >= 30) return 'Master Detective';
  if (level >= 20) return 'Expert Investigator';
  if (level >= 10) return 'Senior Analyst';
  if (level >= 5)  return 'Junior Detective';
  return 'Rookie Debugger';
}

/** Computes the next level from raw XP. Level = floor(xp / 1000) + 1, capped at 100. */
export function xpToLevel(xp: number): number {
  return Math.min(Math.floor(xp / 1000) + 1, 100);
}

/** Formats a number with locale-aware comma separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Returns a human-readable relative time string for a given date. */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

/** Copies text to clipboard and returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
