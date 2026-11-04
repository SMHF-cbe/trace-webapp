/** Rupee thresholds for “Due” styling (store list, entry quick info). */
export const OUTSTANDING_DUE_YELLOW_MAX = 500;
export const OUTSTANDING_DUE_ORANGE_MAX = 1500;

/** Show alert on entry screen when outstanding is above this (same band as red). */
export function shouldWarnHighOutstanding(due: number): boolean {
  return due > OUTSTANDING_DUE_ORANGE_MAX;
}

/**
 * Text color for positive due amounts. Undefined when no due to show.
 * Yellow: (0, 500], orange: (500, 1500], red: > 1500
 */
export function outstandingDueColor(due: number): string | undefined {
  if (due <= 0.005) return undefined;
  if (due <= OUTSTANDING_DUE_YELLOW_MAX) return "#CA8A04";
  if (due <= OUTSTANDING_DUE_ORANGE_MAX) return "#EA580C";
  return "#DC2626";
}
