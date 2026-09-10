import { UserProfile } from '../store/authStore';

// ─────────────────────────────────────────────
// Achievement Definitions
// ─────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** Returns true if the profile qualifies for this achievement */
  check: (profile: UserProfile) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Cases Solved ─────────────────────────────
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Solve your first case.',
    icon: '🩸',
    rarity: 'common',
    check: p => p.casesSolved >= 1,
  },
  {
    id: 'five_cases',
    title: 'On the Case',
    description: 'Solve 5 cases.',
    icon: '🔎',
    rarity: 'common',
    check: p => p.casesSolved >= 5,
  },
  {
    id: 'ten_cases',
    title: 'Senior Analyst',
    description: 'Solve 10 cases.',
    icon: '📂',
    rarity: 'rare',
    check: p => p.casesSolved >= 10,
  },
  {
    id: 'twenty_five_cases',
    title: 'Case Veteran',
    description: 'Solve 25 cases.',
    icon: '🏅',
    rarity: 'epic',
    check: p => p.casesSolved >= 25,
  },
  {
    id: 'fifty_cases',
    title: 'Master Detective',
    description: 'Solve 50 cases.',
    icon: '🕵️',
    rarity: 'legendary',
    check: p => p.casesSolved >= 50,
  },

  // ── Streaks ───────────────────────────────────
  {
    id: 'streak_3',
    title: 'On Fire',
    description: 'Maintain a 3-day streak.',
    icon: '🔥',
    rarity: 'common',
    check: p => p.streak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Weekly Grind',
    description: 'Maintain a 7-day streak.',
    icon: '📅',
    rarity: 'rare',
    check: p => p.streak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Relentless',
    description: 'Maintain a 30-day streak.',
    icon: '⚡',
    rarity: 'legendary',
    check: p => p.streak >= 30,
  },

  // ── Levels ────────────────────────────────────
  {
    id: 'level_5',
    title: 'Junior Detective',
    description: 'Reach Level 5.',
    icon: '⭐',
    rarity: 'common',
    check: p => p.level >= 5,
  },
  {
    id: 'level_10',
    title: 'Double Digits',
    description: 'Reach Level 10.',
    icon: '🌟',
    rarity: 'rare',
    check: p => p.level >= 10,
  },
  {
    id: 'level_20',
    title: 'Expert Investigator',
    description: 'Reach Level 20.',
    icon: '💫',
    rarity: 'epic',
    check: p => p.level >= 20,
  },
  {
    id: 'level_50',
    title: 'Grand Master',
    description: 'Reach Level 50.',
    icon: '👑',
    rarity: 'legendary',
    check: p => p.level >= 50,
  },

  // ── Coins ─────────────────────────────────────
  {
    id: 'rich_detective',
    title: 'Rich Detective',
    description: 'Accumulate 1,000 coins.',
    icon: '💰',
    rarity: 'rare',
    check: p => p.coins >= 1000,
  },
];

// ─────────────────────────────────────────────
// Rarity styling helpers
// ─────────────────────────────────────────────
export const RARITY_STYLES: Record<Achievement['rarity'], string> = {
  common:    'border-slate-500/40 bg-slate-500/10 text-slate-300',
  rare:      'border-blue-500/40 bg-blue-500/10 text-blue-300',
  epic:      'border-purple-500/40 bg-purple-500/10 text-purple-300',
  legendary: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
};

export const RARITY_GLOW: Record<Achievement['rarity'], string> = {
  common:    '',
  rare:      'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  epic:      'shadow-[0_0_12px_rgba(168,85,247,0.4)]',
  legendary: 'shadow-[0_0_16px_rgba(234,179,8,0.5)]',
};

// ─────────────────────────────────────────────
// Compute which achievements are unlocked for a profile
// ─────────────────────────────────────────────
export function getUnlockedAchievements(profile: UserProfile): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.check(profile));
}

// ─────────────────────────────────────────────
// Find newly unlocked achievements (diff between old and new profile)
// ─────────────────────────────────────────────
export function getNewlyUnlocked(
  before: UserProfile,
  after: UserProfile
): Achievement[] {
  const wasBefore = new Set(getUnlockedAchievements(before).map(a => a.id));
  return getUnlockedAchievements(after).filter(a => !wasBefore.has(a.id));
}
