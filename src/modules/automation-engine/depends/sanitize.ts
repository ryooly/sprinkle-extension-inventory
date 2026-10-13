const LIKE_ESCAPE_CHAR = "\\";

const LIKE_METACHARACTERS = /[%_\\]/g;

export function escapeLikePattern(value: string): string {
  return value.replace(
    LIKE_METACHARACTERS,
    (char) => `${LIKE_ESCAPE_CHAR}${char}`,
  );
}
