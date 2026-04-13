/**
 * Bikram Sambat ISO-like week utilities.
 *
 * For simplicity, week boundaries use Sunday–Saturday in UTC+5:45
 * (Nepal Standard Time), matching the traditional Nepali work-week start.
 */

const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/**
 * Returns the Sunday–Saturday week bounds (as UTC Date objects) for the
 * BS week containing `date`, interpreted in UTC+5:45.
 *
 * `start` = Sunday 00:00 NPT (expressed as UTC)
 * `end`   = following Sunday 00:00 NPT (exclusive, expressed as UTC)
 */
export function getBsWeekBounds(date: Date): { start: Date; end: Date } {
    const nptMs = date.getTime() + NPT_OFFSET_MS;
    const npt = new Date(nptMs);

    const dow = npt.getUTCDay(); // 0 = Sunday

    const sundayNpt = new Date(
        Date.UTC(npt.getUTCFullYear(), npt.getUTCMonth(), npt.getUTCDate() - dow),
    );
    const nextSundayNpt = new Date(
        Date.UTC(
            sundayNpt.getUTCFullYear(),
            sundayNpt.getUTCMonth(),
            sundayNpt.getUTCDate() + 7,
        ),
    );

    return {
        start: new Date(sundayNpt.getTime() - NPT_OFFSET_MS),
        end: new Date(nextSundayNpt.getTime() - NPT_OFFSET_MS),
    };
}
