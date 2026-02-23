export function pipValue(num: number | null): number {
  if (num == null) return 0;
  switch (num) {
    case 6:
    case 8:
      return 5;
    case 5:
    case 9:
      return 4;
    case 4:
    case 10:
      return 3;
    case 3:
    case 11:
      return 2;
    case 2:
    case 12:
      return 1;
    default:
      return 0;
  }
}

export function isRed(num: number | null): boolean {
  return num === 6 || num === 8;
}