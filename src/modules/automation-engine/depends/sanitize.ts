




/// akan di proses nanti karean banyak hal dan cabang untuk fungsi ini seprti users output (login, register), dll

// PostgreSQL uses `\` as the default escape character for LIKE/ILIKE, so
// prefixing the metacharacters below makes user input match literally instead
// of being interpreted as a wildcard.
const LIKE_ESCAPE_CHAR = "\\";

const LIKE_METACHARACTERS = /[%_\\]/g;

/**
 * Neutralises LIKE/ILIKE wildcards (`%`, `_`) and the escape character (`\`)
 * in untrusted search input. Always use this before interpolating user input
 * into a LIKE pattern, otherwise a search for `%` matches every row.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(
    LIKE_METACHARACTERS,
    (char) => `${LIKE_ESCAPE_CHAR}${char}`,
  );
}