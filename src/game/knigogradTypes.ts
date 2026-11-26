export type WorkshopId = 1 | 2 | 3;

export type ScreenRoute =
  | { view: 'hub' }
  | { view: 'workshop'; workshop: WorkshopId; task: number } // task: 0..3
  | { view: 'showcase'; workshop: WorkshopId } // finished exhibition / magazine / festival
  | { view: 'results' };

export interface TaskProgress {
  completed: boolean;
  bibliks: number; // 0..3
  mistakes: number;
  usedHint: boolean;
}

export interface FeedbackState {
  success: boolean;
  title: string;
  body: string;
  lesson?: string;
  sticker?: string;
  bibliksAwarded?: number;
  alreadyDone?: boolean;
  nextActionLabel?: string;
  onNext?: 'next_task' | 'showcase' | 'close';
}

export interface ReleasedProject {
  id: string;
  title: string;
  formatId: 'book' | 'magazine' | 'exhibition' | 'smm_show';
  formatLabel: string;
  cover: string;
  rating: number; // 1.0 .. 10.0
  coinsPerSec: number;
  subsPerSec: number;
  isHit: boolean;
}

export interface KnigogradSave {
  w1: TaskProgress[]; // 4 tasks
  w2: TaskProgress[]; // 4 tasks
  w3: TaskProgress[]; // 4 tasks
  exhibitionSections: Record<'life' | 'research' | 'expedition', string[]>;
  magazineHeadline: string;
  festivalName: string;
  soundMuted: boolean;
  subscribers: number;
  coins: number;
  unlockedUpgrades: string[];
  hiredStaff: Record<string, number>;
  releases: ReleasedProject[];
  publishedTrends: number;
}
