export interface GameMediaItem {
  key: string;
  url: string;
}

export interface GameMedia {
  previews: GameMediaItem[];
  tutorials: GameMediaItem[];
}
