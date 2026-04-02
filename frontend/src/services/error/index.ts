import { ErrorIssue } from './types';

class CustomError {
    message;
    issues;
    constructor(message: string, issues: ErrorIssue[] = []) {
        this.message = message;
        this.issues = issues;
    }
}

export { CustomError };
