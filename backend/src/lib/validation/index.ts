import mappers from './mappers';

import { SchemaResult } from './types';

import type { ZodType, ZodTypeDef } from 'zod';

export const parseSchema = <T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): SchemaResult<T> => {
    const { success, data: parsedData, error } = schema.safeParse(data);

    return success ? { success, data: parsedData } : { success, issues: mappers.mapToErrors(error) };
};
