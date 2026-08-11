export interface MinuteInterval {
  startMinute: number;
  endMinute: number;
}

export function intervalsOverlap(a: MinuteInterval, b: MinuteInterval): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

export function hasOverlappingIntervals(intervals: MinuteInterval[]): boolean {
  const sorted = [...intervals].sort((a, b) => a.startMinute - b.startMinute);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMinute < sorted[i - 1].endMinute) {
      return true;
    }
  }
  return false;
}
