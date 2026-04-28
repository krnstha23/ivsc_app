/**
 * Formats a numeric amount with an Rs. prefix and en-IN style grouping.
 */
export function formatRs(
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
) {
    const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
    return `Rs. ${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits,
        maximumFractionDigits,
    })}`;
}
