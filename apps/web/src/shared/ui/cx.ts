/**
 * Minimal class-name joiner for the shared primitives.
 *
 * The UI package has no `clsx`/`tailwind-merge` dependency and Wave 1 adds none. Primitives
 * therefore compose fixed token classes with a caller-supplied `className` appended last, so
 * a screen can override spacing without fighting specificity. Conditional classes pass `false`
 * and are dropped.
 */
export type ClassValue = string | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
