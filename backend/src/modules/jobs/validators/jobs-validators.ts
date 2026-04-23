import { InputValidationException } from 'aop/exceptions/errors/validation';

import { CreateJobInput, UpdateJobInput } from '../types';
import { ErrorMessage } from 'shared/enums/error-messages';

/**
 * Validates that the tool configuration is valid.
 * @param validatedJobInput The validated job input
 * @throws {InputValidationException} If the tool configuration is invalid
 */
const validateToolsSchema = (validatedJobInput: CreateJobInput | UpdateJobInput) => {
    for (const tool of validatedJobInput.tools) {
        if (tool.type === 'scraper') {
            for (const target of tool.targets) {
                if (!tool.keywords && !target.keywords) {
                    const message =
                        'Tool must declare global keywords when a target does not, and a target must declare keywords when the tool does not.';

                    throw new InputValidationException(ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED, {
                        issues: [
                            {
                                property: 'keywords',
                                message,
                            },
                        ],
                    });
                }

                if (!tool.maxPages && !target.maxPages) {
                    const message =
                        'Tool must declare global maxPages when a target does not, and a target must declare maxPages when the tool does not.';

                    throw new InputValidationException(ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED, {
                        issues: [
                            {
                                property: 'maxPages',
                                message,
                            },
                        ],
                    });
                }
            }

            continue;
        }

        if (tool.type === 'email') {
            for (const target of tool.targets) {
                if (!target.subject && !tool.subject) {
                    const message =
                        'Tool must declare global subject when a target does not, and a target must declare subject when the tool does not.';

                    throw new InputValidationException(ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED, {
                        issues: [
                            {
                                property: 'subject',
                                message,
                            },
                        ],
                    });
                }

                if (!target.body && !tool.body) {
                    const message =
                        'Tool must declare global body when a target does not, and a target must declare body when the tool does not.';

                    throw new InputValidationException(ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED, {
                        issues: [
                            {
                                property: 'body',
                                message,
                            },
                        ],
                    });
                }
            }
        }
    }
};

export { validateToolsSchema };
