export function useFeatureFlag(flags: Record<string, boolean>, name: string): boolean {
  return flags[name] === true;
}
