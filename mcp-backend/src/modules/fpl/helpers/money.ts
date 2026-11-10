import { TENTHS_PER_MILLION } from "../constants";

/**
 * Tenth-of-a-million amounts to millions.
 */
function millions(tenths: number): number {
    return tenths / TENTHS_PER_MILLION;
}

export { millions };
