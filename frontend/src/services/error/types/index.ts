import { z } from 'zod';

import { errorIssueSchema } from '../schemas';

type ErrorIssue = z.infer<typeof errorIssueSchema>;

export type { ErrorIssue };
