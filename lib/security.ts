/**
 * Escape JSON content before embedding into an inline <script> block.
 * This prevents accidental script-breaking sequences like </script>.
 */
export function serializeJsonForHtmlScript(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

/**
 * Restrict CSS variable token names to a safe subset.
 */
export function sanitizeCssTokenName(token: string): string | null {
    return /^[a-zA-Z0-9_-]+$/.test(token) ? token : null;
}

/**
 * Allow only common color syntaxes for runtime CSS injection.
 */
export function sanitizeCssColor(value: string): string | null {
    const v = value.trim();
    if (!v) return null;

    const allowed =
        /^#[0-9a-fA-F]{3,8}$/.test(v) ||
        /^rgba?\(\s*[\d.\s,%]+\)$/.test(v) ||
        /^hsla?\(\s*[\d.\s,%]+\)$/.test(v) ||
        /^var\(--[a-zA-Z0-9_-]+\)$/.test(v) ||
        /^[a-zA-Z]+$/.test(v);

    return allowed ? v : null;
}
