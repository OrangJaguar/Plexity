/**
 * Whether a module still needs Starting Point Check.
 */
export function moduleNeedsBaseline(module) {
  if (!module) return false;
  return module.baselineScore == null && !module.baselineSkipped;
}
