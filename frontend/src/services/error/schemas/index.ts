import { z } from 'zod';

const errorIssueSchema = z.object({
    property: z.union([z.string(), z.number()]),
    message: z.string(),
});

const errorSchema = z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(errorIssueSchema).optional(),
});

export { errorIssueSchema, errorSchema };
