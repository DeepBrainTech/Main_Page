/**
 * Static map level configuration for the Training Map.
 * All users see the same content for the same level number.
 * Levels are deterministic — no runtime randomness.
 */

import type { SubTestKey } from "@/types/progression";

export interface MapLevelSubTest {
  key: SubTestKey;
  /** Difficulty 1-5 — passed to getDifficultyConfig */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface MapLevelConfig {
  level: number;
  /** i18n key for the level name */
  titleKey: string;
  subTests: MapLevelSubTest[];
  /** Rough total estimated minutes (shown in UI) */
  estimatedMinutes: number;
}

/**
 * 30 levels: each level specifies exactly which sub-tests to run and at which difficulty.
 * Design rules:
 *  - Levels 1–5:  2 sub-tests, difficulty 1, light focus/reaction/memory
 *  - Levels 6–12: 3 sub-tests, difficulty 1–2, adds logic
 *  - Levels 13–20: 3 sub-tests, difficulty 2–3, adds spatial
 *  - Levels 21–30: 4 sub-tests, difficulty 3–5, full rotation incl. strategy (max 1)
 *  - Strategy tests (hanoi/london/route) only appear in levels 15+, max 1 per level
 *  - Each level covers at least 2 different cognitive dimensions
 */
export const MAP_LEVELS: MapLevelConfig[] = [
  // ── Stage 1: Starter (Levels 1-5) ──────────────────────────────────────────
  {
    level: 1,
    titleKey: "mapLevel.warm_up",
    estimatedMinutes: 3,
    subTests: [
      { key: "focus_stroop",   difficulty: 1 },
      { key: "reaction_click", difficulty: 1 },
    ],
  },
  {
    level: 2,
    titleKey: "mapLevel.first_spark",
    estimatedMinutes: 3,
    subTests: [
      { key: "memory_nback",   difficulty: 1 },
      { key: "focus_flanker",  difficulty: 1 },
    ],
  },
  {
    level: 3,
    titleKey: "mapLevel.awakening",
    estimatedMinutes: 4,
    subTests: [
      { key: "reaction_arrow", difficulty: 1 },
      { key: "memory_sternberg", difficulty: 1 },
    ],
  },
  {
    level: 4,
    titleKey: "mapLevel.getting_sharper",
    estimatedMinutes: 4,
    subTests: [
      { key: "focus_schulte",  difficulty: 1 },
      { key: "reaction_pvt",   difficulty: 1 },
    ],
  },
  {
    level: 5,
    titleKey: "mapLevel.first_milestone",
    estimatedMinutes: 5,
    subTests: [
      { key: "memory_change",  difficulty: 1 },
      { key: "focus_stroop",   difficulty: 1 },
      { key: "reaction_click", difficulty: 1 },
    ],
  },

  // ── Stage 2: Growing (Levels 6-10) ──────────────────────────────────────────
  {
    level: 6,
    titleKey: "mapLevel.logic_awakens",
    estimatedMinutes: 5,
    subTests: [
      { key: "logic_transitive", difficulty: 1 },
      { key: "focus_flanker",    difficulty: 1 },
      { key: "reaction_arrow",   difficulty: 1 },
    ],
  },
  {
    level: 7,
    titleKey: "mapLevel.pattern_hunter",
    estimatedMinutes: 5,
    subTests: [
      { key: "memory_nback",     difficulty: 2 },
      { key: "logic_transitive", difficulty: 1 },
      { key: "reaction_click",   difficulty: 1 },
    ],
  },
  {
    level: 8,
    titleKey: "mapLevel.focus_trial",
    estimatedMinutes: 5,
    subTests: [
      { key: "focus_stroop",     difficulty: 2 },
      { key: "memory_sternberg", difficulty: 1 },
      { key: "focus_schulte",    difficulty: 1 },
    ],
  },
  {
    level: 9,
    titleKey: "mapLevel.speed_and_memory",
    estimatedMinutes: 6,
    subTests: [
      { key: "reaction_pvt",     difficulty: 2 },
      { key: "memory_change",    difficulty: 1 },
      { key: "focus_flanker",    difficulty: 2 },
    ],
  },
  {
    level: 10,
    titleKey: "mapLevel.second_milestone",
    estimatedMinutes: 6,
    subTests: [
      { key: "logic_transitive", difficulty: 2 },
      { key: "memory_nback",     difficulty: 2 },
      { key: "focus_schulte",    difficulty: 2 },
    ],
  },

  // ── Stage 3: Intermediate (Levels 11-15) ───────────────────────────────────
  {
    level: 11,
    titleKey: "mapLevel.spatial_entry",
    estimatedMinutes: 6,
    subTests: [
      { key: "spatial_rotation", difficulty: 1 },
      { key: "reaction_arrow",   difficulty: 2 },
      { key: "memory_sternberg", difficulty: 2 },
    ],
  },
  {
    level: 12,
    titleKey: "mapLevel.mind_fold",
    estimatedMinutes: 6,
    subTests: [
      { key: "spatial_fold",     difficulty: 1 },
      { key: "focus_stroop",     difficulty: 2 },
      { key: "logic_transitive", difficulty: 2 },
    ],
  },
  {
    level: 13,
    titleKey: "mapLevel.reasoning_surge",
    estimatedMinutes: 7,
    subTests: [
      { key: "logic_syllogism",  difficulty: 1 },
      { key: "spatial_rotation", difficulty: 2 },
      { key: "reaction_pvt",     difficulty: 2 },
    ],
  },
  {
    level: 14,
    titleKey: "mapLevel.analogy_master",
    estimatedMinutes: 7,
    subTests: [
      { key: "logic_analogy",    difficulty: 1 },
      { key: "memory_change",    difficulty: 2 },
      { key: "focus_flanker",    difficulty: 3 },
    ],
  },
  {
    level: 15,
    titleKey: "mapLevel.third_milestone",
    estimatedMinutes: 8,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 1 },
      { key: "spatial_fold",     difficulty: 2 },
      { key: "memory_nback",     difficulty: 3 },
    ],
  },

  // ── Stage 4: Advanced (Levels 16-22) ───────────────────────────────────────
  {
    level: 16,
    titleKey: "mapLevel.full_rotation",
    estimatedMinutes: 8,
    subTests: [
      { key: "focus_schulte",    difficulty: 3 },
      { key: "logic_syllogism",  difficulty: 1 },
      { key: "reaction_click",   difficulty: 3 },
      { key: "spatial_rotation", difficulty: 2 },
    ],
  },
  {
    level: 17,
    titleKey: "mapLevel.deep_focus",
    estimatedMinutes: 8,
    subTests: [
      { key: "focus_stroop",     difficulty: 3 },
      { key: "memory_sternberg", difficulty: 3 },
      { key: "logic_analogy",    difficulty: 2 },
    ],
  },
  {
    level: 18,
    titleKey: "mapLevel.tower_challenge",
    estimatedMinutes: 8,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 2 },
      { key: "reaction_pvt",     difficulty: 3 },
      { key: "spatial_fold",     difficulty: 3 },
    ],
  },
  {
    level: 19,
    titleKey: "mapLevel.memory_fortress",
    estimatedMinutes: 9,
    subTests: [
      { key: "memory_nback",     difficulty: 3 },
      { key: "memory_change",    difficulty: 3 },
      { key: "logic_transitive", difficulty: 3 },
      { key: "reaction_arrow",   difficulty: 3 },
    ],
  },
  {
    level: 20,
    titleKey: "mapLevel.fourth_milestone",
    estimatedMinutes: 9,
    subTests: [
      { key: "logic_analogy",    difficulty: 2 },
      { key: "spatial_rotation", difficulty: 3 },
      { key: "focus_flanker",    difficulty: 4 },
      { key: "memory_sternberg", difficulty: 3 },
    ],
  },
  {
    level: 21,
    titleKey: "mapLevel.logic_overdrive",
    estimatedMinutes: 9,
    subTests: [
      { key: "logic_syllogism",  difficulty: 2 },
      { key: "focus_schulte",    difficulty: 4 },
      { key: "reaction_click",   difficulty: 4 },
    ],
  },
  {
    level: 22,
    titleKey: "mapLevel.london_debut",
    estimatedMinutes: 10,
    subTests: [
      { key: "strategy_london",  difficulty: 1 },
      { key: "memory_nback",     difficulty: 4 },
      { key: "spatial_fold",     difficulty: 3 },
    ],
  },

  // ── Stage 5: Expert (Levels 23-30) ─────────────────────────────────────────
  {
    level: 23,
    titleKey: "mapLevel.spatial_master",
    estimatedMinutes: 10,
    subTests: [
      { key: "spatial_rotation", difficulty: 4 },
      { key: "spatial_fold",     difficulty: 4 },
      { key: "logic_analogy",    difficulty: 3 },
    ],
  },
  {
    level: 24,
    titleKey: "mapLevel.reaction_elite",
    estimatedMinutes: 9,
    subTests: [
      { key: "reaction_pvt",     difficulty: 4 },
      { key: "reaction_arrow",   difficulty: 4 },
      { key: "focus_stroop",     difficulty: 4 },
      { key: "memory_change",    difficulty: 3 },
    ],
  },
  {
    level: 25,
    titleKey: "mapLevel.fifth_milestone",
    estimatedMinutes: 10,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 3 },
      { key: "logic_syllogism",  difficulty: 3 },
      { key: "memory_sternberg", difficulty: 4 },
    ],
  },
  {
    level: 26,
    titleKey: "mapLevel.route_explorer",
    estimatedMinutes: 10,
    subTests: [
      { key: "strategy_route",   difficulty: 1 },
      { key: "spatial_fold",     difficulty: 5 },
      { key: "focus_schulte",    difficulty: 5 },
    ],
  },
  {
    level: 27,
    titleKey: "mapLevel.peak_focus",
    estimatedMinutes: 10,
    subTests: [
      { key: "focus_flanker",    difficulty: 5 },
      { key: "focus_stroop",     difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
      { key: "reaction_click",   difficulty: 5 },
    ],
  },
  {
    level: 28,
    titleKey: "mapLevel.full_strategy",
    estimatedMinutes: 11,
    subTests: [
      { key: "strategy_london",  difficulty: 2 },
      { key: "logic_analogy",    difficulty: 4 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },
  {
    level: 29,
    titleKey: "mapLevel.grand_trial",
    estimatedMinutes: 11,
    subTests: [
      { key: "logic_syllogism",  difficulty: 4 },
      { key: "memory_sternberg", difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
    ],
  },
  {
    level: 30,
    titleKey: "mapLevel.brain_champion",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_route",   difficulty: 2 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
      { key: "focus_schulte",    difficulty: 5 },
    ],
  },

  // ── Stage 6: Legend (Levels 31–40) ─────────────────────────────────────────
  {
    level: 31,
    titleKey: "mapLevel.legend_begins",
    estimatedMinutes: 10,
    subTests: [
      { key: "memory_sternberg", difficulty: 4 },
      { key: "focus_stroop",     difficulty: 5 },
      { key: "reaction_arrow",   difficulty: 5 },
    ],
  },
  {
    level: 32,
    titleKey: "mapLevel.tower_legend",
    estimatedMinutes: 11,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 4 },
      { key: "logic_transitive", difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },
  {
    level: 33,
    titleKey: "mapLevel.quantum_focus",
    estimatedMinutes: 10,
    subTests: [
      { key: "focus_flanker",    difficulty: 5 },
      { key: "memory_change",    difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
      { key: "focus_schulte",    difficulty: 5 },
    ],
  },
  {
    level: 34,
    titleKey: "mapLevel.logic_legend",
    estimatedMinutes: 11,
    subTests: [
      { key: "logic_syllogism",  difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
    ],
  },
  {
    level: 35,
    titleKey: "mapLevel.sixth_milestone",
    estimatedMinutes: 11,
    subTests: [
      { key: "strategy_london",  difficulty: 3 },
      { key: "memory_nback",     difficulty: 5 },
      { key: "reaction_click",   difficulty: 5 },
      { key: "logic_transitive", difficulty: 5 },
    ],
  },
  {
    level: 36,
    titleKey: "mapLevel.memory_legend",
    estimatedMinutes: 10,
    subTests: [
      { key: "memory_sternberg", difficulty: 5 },
      { key: "memory_change",    difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
    ],
  },
  {
    level: 37,
    titleKey: "mapLevel.route_master",
    estimatedMinutes: 11,
    subTests: [
      { key: "strategy_route",   difficulty: 3 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "focus_stroop",     difficulty: 5 },
    ],
  },
  {
    level: 38,
    titleKey: "mapLevel.full_legend",
    estimatedMinutes: 12,
    subTests: [
      { key: "logic_analogy",    difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
      { key: "memory_sternberg", difficulty: 5 },
    ],
  },
  {
    level: 39,
    titleKey: "mapLevel.reaction_legend",
    estimatedMinutes: 10,
    subTests: [
      { key: "reaction_arrow",   difficulty: 5 },
      { key: "reaction_click",   difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
    ],
  },
  {
    level: 40,
    titleKey: "mapLevel.seventh_milestone",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "logic_syllogism",  difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },

  // ── Stage 7: Grandmaster (Levels 41–50) ────────────────────────────────────
  {
    level: 41,
    titleKey: "mapLevel.grandmaster_entry",
    estimatedMinutes: 11,
    subTests: [
      { key: "focus_schulte",    difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "memory_change",    difficulty: 5 },
    ],
  },
  {
    level: 42,
    titleKey: "mapLevel.strategy_storm",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_london",  difficulty: 4 },
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
    ],
  },
  {
    level: 43,
    titleKey: "mapLevel.mind_storm",
    estimatedMinutes: 11,
    subTests: [
      { key: "memory_sternberg", difficulty: 5 },
      { key: "logic_transitive", difficulty: 5 },
      { key: "reaction_arrow",   difficulty: 5 },
      { key: "focus_stroop",     difficulty: 5 },
    ],
  },
  {
    level: 44,
    titleKey: "mapLevel.route_grandmaster",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_route",   difficulty: 4 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
    ],
  },
  {
    level: 45,
    titleKey: "mapLevel.eighth_milestone",
    estimatedMinutes: 12,
    subTests: [
      { key: "logic_syllogism",  difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
    ],
  },
  {
    level: 46,
    titleKey: "mapLevel.final_memory",
    estimatedMinutes: 11,
    subTests: [
      { key: "memory_change",    difficulty: 5 },
      { key: "memory_sternberg", difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
    ],
  },
  {
    level: 47,
    titleKey: "mapLevel.supreme_focus",
    estimatedMinutes: 11,
    subTests: [
      { key: "focus_schulte",    difficulty: 5 },
      { key: "focus_stroop",     difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
      { key: "reaction_click",   difficulty: 5 },
    ],
  },
  {
    level: 48,
    titleKey: "mapLevel.london_legend",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_london",  difficulty: 5 },
      { key: "logic_transitive", difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
    ],
  },
  {
    level: 49,
    titleKey: "mapLevel.ultimate_route",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_route",   difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
    ],
  },
  {
    level: 50,
    titleKey: "mapLevel.brain_legend",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "strategy_london",  difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "memory_sternberg", difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },

  // Stage 8: Mythic (Levels 51-60)
  {
    level: 51,
    titleKey: "mapLevel.spatial_route",
    estimatedMinutes: 11,
    subTests: [
      { key: "strategy_route",   difficulty: 4 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "reaction_arrow",   difficulty: 5 },
    ],
  },
  {
    level: 52,
    titleKey: "mapLevel.logic_tower",
    estimatedMinutes: 11,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 4 },
      { key: "logic_transitive", difficulty: 5 },
      { key: "focus_stroop",     difficulty: 5 },
    ],
  },
  {
    level: 53,
    titleKey: "mapLevel.folded_speed",
    estimatedMinutes: 11,
    subTests: [
      { key: "spatial_fold",     difficulty: 5 },
      { key: "reaction_click",   difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
    ],
  },
  {
    level: 54,
    titleKey: "mapLevel.london_memory",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_london",  difficulty: 4 },
      { key: "memory_change",    difficulty: 5 },
      { key: "logic_syllogism",  difficulty: 5 },
    ],
  },
  {
    level: 55,
    titleKey: "mapLevel.ninth_milestone",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_route",   difficulty: 4 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
    ],
  },
  {
    level: 56,
    titleKey: "mapLevel.dual_strategy",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "strategy_london",  difficulty: 4 },
      { key: "focus_schulte",    difficulty: 5 },
    ],
  },
  {
    level: 57,
    titleKey: "mapLevel.spatial_storm",
    estimatedMinutes: 11,
    subTests: [
      { key: "spatial_fold",     difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "reaction_arrow",   difficulty: 5 },
    ],
  },
  {
    level: 58,
    titleKey: "mapLevel.logic_route",
    estimatedMinutes: 12,
    subTests: [
      { key: "logic_transitive", difficulty: 5 },
      { key: "strategy_route",   difficulty: 4 },
      { key: "reaction_click",   difficulty: 5 },
    ],
  },
  {
    level: 59,
    titleKey: "mapLevel.focus_tower",
    estimatedMinutes: 12,
    subTests: [
      { key: "focus_stroop",     difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
    ],
  },
  {
    level: 60,
    titleKey: "mapLevel.apex_trial",
    estimatedMinutes: 13,
    subTests: [
      { key: "strategy_london",  difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "logic_syllogism",  difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
    ],
  },

  // Stage 9: Apex (Levels 61-72)
  {
    level: 61,
    titleKey: "mapLevel.route_legend_plus",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_route",   difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },
  {
    level: 62,
    titleKey: "mapLevel.grand_planner",
    estimatedMinutes: 12,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "strategy_london",  difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
    ],
  },
  {
    level: 63,
    titleKey: "mapLevel.spatial_logic_fusion",
    estimatedMinutes: 12,
    subTests: [
      { key: "spatial_fold",     difficulty: 5 },
      { key: "logic_transitive", difficulty: 5 },
      { key: "focus_schulte",    difficulty: 5 },
    ],
  },
  {
    level: 64,
    titleKey: "mapLevel.reaction_maze",
    estimatedMinutes: 12,
    subTests: [
      { key: "reaction_arrow",   difficulty: 5 },
      { key: "reaction_click",   difficulty: 5 },
      { key: "strategy_route",   difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },
  {
    level: 65,
    titleKey: "mapLevel.tenth_milestone",
    estimatedMinutes: 13,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
      { key: "memory_sternberg", difficulty: 5 },
      { key: "logic_syllogism",  difficulty: 5 },
    ],
  },
  {
    level: 66,
    titleKey: "mapLevel.precision_focus",
    estimatedMinutes: 12,
    subTests: [
      { key: "focus_stroop",     difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
    ],
  },
  {
    level: 67,
    titleKey: "mapLevel.memory_strategy",
    estimatedMinutes: 12,
    subTests: [
      { key: "memory_change",    difficulty: 5 },
      { key: "strategy_london",  difficulty: 5 },
      { key: "strategy_route",   difficulty: 5 },
    ],
  },
  {
    level: 68,
    titleKey: "mapLevel.folded_planner",
    estimatedMinutes: 12,
    subTests: [
      { key: "spatial_fold",     difficulty: 5 },
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
    ],
  },
  {
    level: 69,
    titleKey: "mapLevel.speed_grandmaster",
    estimatedMinutes: 13,
    subTests: [
      { key: "reaction_click",   difficulty: 5 },
      { key: "reaction_arrow",   difficulty: 5 },
      { key: "focus_schulte",    difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
    ],
  },
  {
    level: 70,
    titleKey: "mapLevel.whole_brain_apex",
    estimatedMinutes: 14,
    subTests: [
      { key: "strategy_route",   difficulty: 5 },
      { key: "logic_syllogism",  difficulty: 5 },
      { key: "memory_nback",     difficulty: 5 },
      { key: "focus_flanker",    difficulty: 5 },
      { key: "spatial_fold",     difficulty: 5 },
    ],
  },
  {
    level: 71,
    titleKey: "mapLevel.ultimate_planning",
    estimatedMinutes: 14,
    subTests: [
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "strategy_london",  difficulty: 5 },
      { key: "strategy_route",   difficulty: 5 },
      { key: "reaction_pvt",     difficulty: 5 },
    ],
  },
  {
    level: 72,
    titleKey: "mapLevel.final_apex",
    estimatedMinutes: 15,
    subTests: [
      { key: "strategy_route",   difficulty: 5 },
      { key: "strategy_hanoi",   difficulty: 5 },
      { key: "logic_analogy",    difficulty: 5 },
      { key: "spatial_rotation", difficulty: 5 },
      { key: "memory_sternberg", difficulty: 5 },
    ],
  },
];

export const TOTAL_MAP_LEVELS = MAP_LEVELS.length; // 72

/** Returns the config for a given level (1-indexed). Returns undefined if out of range. */
export function getMapLevel(level: number): MapLevelConfig | undefined {
  return MAP_LEVELS[level - 1];
}
