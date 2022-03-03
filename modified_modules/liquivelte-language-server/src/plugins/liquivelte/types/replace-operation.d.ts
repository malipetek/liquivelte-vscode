export type ReplaceRange = {
  lines: number[];
  start?: number;
  end?: number;
};

export type ReplaceOperation = {
  was: ReplaceRange;
  operation: ReplaceRange;
  explanation: string;
  linesAdded?: number;
  active?: boolean;
};