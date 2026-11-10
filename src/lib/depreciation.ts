/** Age in years using calendar months. */
export function ageYears(year: number, month: number, asOf: Date): number {
  const nowYear = asOf.getUTCFullYear();
  const nowMonth = asOf.getUTCMonth() + 1;
  return ((nowYear - year) * 12 + (nowMonth - month)) / 12;
}

export function chipRank(chip: string, year: number): number {
  const value = chip.toLowerCase();
  const table: [string, number][] = [
    ["m5 ultra", 110],
    ["m5 max", 104],
    ["m5 pro", 98],
    ["m4 max", 94],
    ["m4 pro", 88],
    ["m3 ultra", 92],
    ["m3 max", 84],
    ["m3 pro", 78],
    ["m2 ultra", 82],
    ["m2 max", 74],
    ["m2 pro", 68],
    ["m1 ultra", 72],
    ["m1 max", 64],
    ["m1 pro", 58],
    ["a18 pro", 44],
    ["m6", 93],
    ["m5", 90],
    ["m4", 80],
    ["m3", 70],
    ["m2", 60],
    ["m1", 50],
  ];
  for (const [key, rank] of table) {
    if (value.includes(key)) return rank;
  }
  return Math.max(4, Math.min(36, (year - 2006) * 1.6));
}
