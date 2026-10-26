export interface GameLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  completed_levels: number;
  is_current_user: boolean;
}

export interface GameLeaderboard {
  metric: "completed_levels";
  entries: GameLeaderboardEntry[];
}
