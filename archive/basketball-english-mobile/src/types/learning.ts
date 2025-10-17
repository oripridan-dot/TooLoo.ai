export interface LearningSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  wordsLearned: string[];
  correctRecalls: number;
  hesitations: number;
  needsRecovery: boolean;
}

export interface WordCluster {
  word: string;
  translation: string;
  action: string;
}

export interface Progress {
  totalSessions: number;
  completedSessions: number;
  correctRecalls: number;
  hesitations: number;
  recoveryNeeded: boolean;
}