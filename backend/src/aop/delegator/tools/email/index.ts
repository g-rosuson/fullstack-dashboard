import type { OnTargetFinish } from '../../tools/types';
import type { EmailTool } from 'shared/types/jobs/tools/types-tools-email';

/**
 * Email tool handler for executing email job operations.
 */
class Email {
    /**
     * Executes the scraper tool for given targets.
     */
    async execute({ tool, onTargetFinish }: { tool: EmailTool; onTargetFinish: OnTargetFinish }) {
        console.log(tool, onTargetFinish);
    }
}

export default Email;
