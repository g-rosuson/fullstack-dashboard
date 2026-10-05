/**
 * JSON logs to stdout. LOG_LEVEL is a floor: debug < info < warn < error.
 * `info` prints info, warn, and error; debug is skipped. A printed line is never trimmed.
 *
 * Call `log.setLevel` from `loadConfig` at boot. Tests may call it again.
 * Pass an `Error` as `err` and emit serializes name, message, and stack.
 */

const logLevels = ["debug", "info", "warn", "error"] as const;

type LogLevel = (typeof logLevels)[number];

/**
 * Extra fields merged into a JSON log line alongside ts, level, and msg.
 */
interface LogFields {
    [key: string]: unknown;
}

let floor: LogLevel = "info";

/**
 * Sets the floor. Does not validate; env parsing already does.
 */
function setLevel(level: LogLevel): void {
    floor = level;
}

/**
 * Turns an Error into name/message/stack; other values pass through.
 */
function serializeErr(value: unknown): unknown {
    if (!(value instanceof Error)) {
        return value;
    }

    return { name: value.name, message: value.message, stack: value.stack };
}

/**
 * Prints one JSON line when `level` is at or above the floor.
 */
function emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (logLevels.indexOf(level) < logLevels.indexOf(floor)) {
        return;
    }

    const line = {
        ts: new Date().toISOString(),
        level,
        msg: message,
        ...fields,
        ...(fields?.err !== undefined ? { err: serializeErr(fields.err) } : {}),
    };

    console.log(JSON.stringify(line));
}

const log = {
    setLevel,
    debug(message: string, fields?: LogFields): void {
        emit("debug", message, fields);
    },
    info(message: string, fields?: LogFields): void {
        emit("info", message, fields);
    },
    warn(message: string, fields?: LogFields): void {
        emit("warn", message, fields);
    },
    error(message: string, fields?: LogFields): void {
        emit("error", message, fields);
    },
};

export { log, logLevels };
export type { LogLevel };
