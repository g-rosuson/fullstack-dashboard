import { z } from 'zod';

import { emailToolSchema } from 'shared/schemas/jobs/tools/schemas-tools-email';

type EmailTool = z.infer<typeof emailToolSchema>;

export type { EmailTool };
