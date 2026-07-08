/** Join class names, dropping falsy entries. A dependency-free stand-in for
 * clsx — enough for conditional Tailwind classes without pulling in a package. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
