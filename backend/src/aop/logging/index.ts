import config from 'config';

import { Meta } from './types';

class Logger {
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta: Meta) {
        const timestamp = new Date().toISOString();

        const logData = {
            timestamp,
            level,
            message,
            issues: meta?.issues || [],
            error: meta?.error || {},
        };

        if (config.isDeveloping && config.enableLogging) {
            console[level](JSON.stringify(logData, null, 2));
            return;
        }

        if (config.enableLogging) {
            console[level](JSON.stringify(logData));
        }
    }

    debug(message: string, meta: Meta = {}) {
        this.log('debug', message, meta);
    }

    info(message: string, meta: Meta = {}) {
        this.log('info', message, meta);
    }

    warn(message: string, meta: Meta = {}) {
        this.log('warn', message, meta);
    }

    error(message: string, meta: Meta) {
        this.log('error', message, meta);
    }
}

export const logger = new Logger();
