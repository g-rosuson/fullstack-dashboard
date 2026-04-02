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

const time = {
    sleep,
    throttle,
};

export default time;
