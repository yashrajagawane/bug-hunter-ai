import { describe, it, expect } from 'vitest';
import { getRankTitle, xpToLevel, timeAgo, formatNumber } from './utils';

// ─────────────────────────────────────────────
// getRankTitle
// ─────────────────────────────────────────────
describe('getRankTitle', () => {
  it('returns Rookie Debugger for level 1', () => {
    expect(getRankTitle(1)).toBe('Rookie Debugger');
  });

  it('returns Junior Detective at level 5', () => {
    expect(getRankTitle(5)).toBe('Junior Detective');
  });

  it('returns Junior Detective at level 6', () => {
    expect(getRankTitle(6)).toBe('Junior Detective');
  });

  it('returns Senior Analyst at level 10', () => {
    expect(getRankTitle(10)).toBe('Senior Analyst');
  });

  it('returns Expert Investigator at level 20', () => {
    expect(getRankTitle(20)).toBe('Expert Investigator');
  });

  it('returns Master Detective at level 30', () => {
    expect(getRankTitle(30)).toBe('Master Detective');
  });

  it('returns Grand Master Detective at level 50', () => {
    expect(getRankTitle(50)).toBe('Grand Master Detective');
  });

  it('returns Grand Master Detective at level 100', () => {
    expect(getRankTitle(100)).toBe('Grand Master Detective');
  });
});

// ─────────────────────────────────────────────
// xpToLevel
// ─────────────────────────────────────────────
describe('xpToLevel', () => {
  it('level 1 at xp=0', () => {
    expect(xpToLevel(0)).toBe(1);
  });

  it('level 1 at xp=999', () => {
    expect(xpToLevel(999)).toBe(1);
  });

  it('level 2 at xp=1000', () => {
    expect(xpToLevel(1000)).toBe(2);
  });

  it('level 2 at xp=1999', () => {
    expect(xpToLevel(1999)).toBe(2);
  });

  it('level 3 at xp=2000', () => {
    expect(xpToLevel(2000)).toBe(3);
  });

  it('caps at level 100 for any huge xp', () => {
    expect(xpToLevel(9_999_999)).toBe(100);
  });
});

// ─────────────────────────────────────────────
// formatNumber
// ─────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats 1000 with comma', () => {
    expect(formatNumber(1000)).toMatch(/1[,.]000/);
  });

  it('passes through small numbers unchanged', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

// ─────────────────────────────────────────────
// timeAgo
// ─────────────────────────────────────────────
describe('timeAgo', () => {
  it('returns Today for now', () => {
    expect(timeAgo(new Date())).toBe('Today');
  });

  it('returns Yesterday for 1 day ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(timeAgo(d)).toBe('Yesterday');
  });

  it('returns "N days ago" for 5 days ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    expect(timeAgo(d)).toBe('5 days ago');
  });

  it('returns "N weeks ago" for 14 days ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    expect(timeAgo(d)).toBe('2 weeks ago');
  });

  it('returns "N months ago" for 60 days ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    expect(timeAgo(d)).toBe('2 months ago');
  });
});
