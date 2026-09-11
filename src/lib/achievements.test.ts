import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, getUnlockedAchievements, getNewlyUnlocked } from './achievements';

// Minimal profile shape (only fields the achievement checker reads)
function makeProfile(overrides: Partial<{
  xp: number; level: number; casesSolved: number; streak: number; coins: number;
}>) {
  return {
    uid: 'test-uid',
    username: 'TestUser',
    email: 'test@test.com',
    xp: 0,
    level: 1,
    casesSolved: 0,
    streak: 0,
    coins: 500,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as any;
}

// ─────────────────────────────────────────────
// getUnlockedAchievements
// ─────────────────────────────────────────────
describe('getUnlockedAchievements', () => {
  it('returns empty array for a brand new profile', () => {
    const p = makeProfile({ xp: 0, casesSolved: 0, streak: 0 });
    const unlocked = getUnlockedAchievements(p);
    expect(unlocked).toHaveLength(0);
  });

  it('unlocks "First Blood" after solving 1 case', () => {
    const p = makeProfile({ casesSolved: 1 });
    const unlocked = getUnlockedAchievements(p);
    const ids = unlocked.map(a => a.id);
    expect(ids).toContain('first_blood');
  });

  it('does NOT unlock "On the Case" with only 4 cases solved', () => {
    const p = makeProfile({ casesSolved: 4 });
    const unlocked = getUnlockedAchievements(p);
    const ids = unlocked.map(a => a.id);
    expect(ids).not.toContain('five_cases');
  });

  it('unlocks "On the Case" with 5 cases solved', () => {
    const p = makeProfile({ casesSolved: 5 });
    const unlocked = getUnlockedAchievements(p);
    const ids = unlocked.map(a => a.id);
    expect(ids).toContain('five_cases');
  });

  it('unlocks "Weekly Grind" streak achievement at streak=7', () => {
    const p = makeProfile({ streak: 7 });
    const unlocked = getUnlockedAchievements(p);
    const ids = unlocked.map(a => a.id);
    expect(ids).toContain('streak_7');
  });

  it('returns all achievements for a maxed-out profile', () => {
    const p = makeProfile({ xp: 999999, level: 100, casesSolved: 999, streak: 999, coins: 999999 });
    const unlocked = getUnlockedAchievements(p);
    expect(unlocked.length).toBe(ACHIEVEMENTS.length);
  });
});

// ─────────────────────────────────────────────
// getNewlyUnlocked
// ─────────────────────────────────────────────
describe('getNewlyUnlocked', () => {
  it('returns empty when nothing new is unlocked', () => {
    const before = makeProfile({ casesSolved: 1 });
    const after  = makeProfile({ casesSolved: 1 });
    expect(getNewlyUnlocked(before, after)).toHaveLength(0);
  });

  it('returns only the newly unlocked achievement', () => {
    const before = makeProfile({ casesSolved: 4 });
    const after  = makeProfile({ casesSolved: 5 }); // five_cases threshold
    const newly = getNewlyUnlocked(before, after);
    const ids = newly.map(a => a.id);
    expect(ids).toContain('five_cases');
  });

  it('does not return achievements already unlocked before', () => {
    const before = makeProfile({ casesSolved: 5 }); // five_cases already unlocked
    const after  = makeProfile({ casesSolved: 6 });
    const newly = getNewlyUnlocked(before, after);
    const ids = newly.map(a => a.id);
    expect(ids).not.toContain('five_cases');
  });
});
