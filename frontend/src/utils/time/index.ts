/**
 * Returns a promise that resolves after the given time,
 * useful for introductin articial delay before code execution.
 */
const sleep = (time = 250) =>
    new Promise(resolve => {
        setTimeout(resolve, time);
    });

/**
 * Throttles a function so it's only allowed to run once every X ms,
 * useful for blocking rapid consecutive calls (e.g., theme toggle).
 */
const throttle = <T extends (...args: any[]) => void>(fn: T, delay = 500) => {
    let ready = true;

    return (...args: Parameters<T>) => {
        if (!ready) {
            return;
        }

        ready = false;

        fn(...args);

        setTimeout(() => {
            ready = true;
        }, delay);
    };
};

/**
 * Gets the time from a date string using locale-aware formatting.
 * @param date - The date string to get the time from.
 * @param locale - Optional locale (e.g., 'en-US', 'de-CH'). Defaults to system locale.
 * @returns The time string or null if invalid.
 */
const getTimeFromDate = (date: string, locale?: string): string | null => {
    try {
        const parsed = new Date(date);

        if (isNaN(parsed.getTime())) {
            return null;
        }

        const formatter = new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
        });

        return formatter.format(parsed);
    } catch {
        return null;
    }
};

const time = {
    sleep,
    throttle,
    getTimeFromDate,
};

export default time;
