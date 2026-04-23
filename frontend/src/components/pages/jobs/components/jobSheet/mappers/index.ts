import { set } from 'date-fns';

import type { JobFormSheetState, JobFormSheetTool } from '../types/JobSheet.types';
import type {
    CreateJobInput,
    CreateJobTool,
    EmailToolTargetName,
    JobSchedule,
    JobScheduleType,
    ScraperToolTargetName,
    Tool,
    UpdateJobInput,
    UpdateJobTool,
} from '@/_types/_gen';

/**
 * Maps an array of tools to an array of JobFormSheetTools.
 *
 * Uses a `switch` on `tool.type` with a `never`-based default so that if `Tool` gains a new
 * variant, TypeScript fails at compile time until this mapper handles it.
 *
 * @param tools - The tools to map.
 * @returns An array of JobFormSheetTools.
 */
const mapToJobFormTools = (tools: Tool[]): JobFormSheetTool[] => {
    const jobFormTools: JobFormSheetTool[] = [];
    for (const tool of tools) {
        switch (tool.type) {
            case 'scraper':
                jobFormTools.push({
                    type: 'scraper' as const,
                    keyword: '',
                    keywords: tool.keywords || [],
                    maxPages: tool.maxPages || 0,
                    toolId: tool.toolId,
                    targets: tool.targets.map(targetItem => {
                        const label = targetItem.target.charAt(0).toUpperCase() + targetItem.target.slice(1);
                        return {
                            label,
                            target: targetItem.target,
                            keyword: '',
                            keywords: targetItem.keywords || [],
                            maxPages: targetItem.maxPages || 0,
                            targetId: targetItem.targetId,
                        };
                    }),
                });
                break;
            case 'email':
                jobFormTools.push({
                    type: 'email' as const,
                    subject: tool.subject || '',
                    body: tool.body || '',
                    toolId: tool.toolId,
                    targets: tool.targets.map(targetItem => {
                        const label = targetItem.target.charAt(0).toUpperCase() + targetItem.target.slice(1);
                        return {
                            target: targetItem.target,
                            label,
                            subject: targetItem.subject || '',
                            targetId: targetItem.targetId,
                            body: targetItem.body || '',
                        };
                    }),
                });
                break;
            default: {
                const _exhaustive: never = tool;
                return _exhaustive;
            }
        }
    }

    return jobFormTools;
};

/**
 * Maps a JobFormSheetState to a JobSchedule.
 * @param jobSheetFormState - The JobFormSheetState to map.
 * @returns A JobSchedule.
 */
const _mapToSchedule = (jobSheetFormState: JobFormSheetState): JobSchedule => {
    if (!jobSheetFormState.scheduleType) {
        return null;
    }

    /**
     * Converts a date and time string to an ISO string.
     * @param date - The date to convert.
     * @param time - The time to convert.
     * @returns An ISO string.
     * @note Move to a shared utility function, when used in other places.
     */
    const dateAndTimeToIsoString = (date: Date, time: string): string => {
        const [h, m] = time.split(':');

        const hours = Number(h);
        const minutes = Number(m);

        if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error(`Invalid time string: "${time}"`);
        }

        return set(date, {
            hours,
            minutes,
            seconds: 0,
            milliseconds: 0,
        }).toISOString();
    };

    if (!jobSheetFormState.startDate) {
        throw new Error('Start date is required');
    }

    const startDate = dateAndTimeToIsoString(jobSheetFormState.startDate, jobSheetFormState.startTime);
    const endDate = jobSheetFormState.endDate
        ? dateAndTimeToIsoString(jobSheetFormState.endDate, jobSheetFormState.endTime)
        : null;

    return {
        type: jobSheetFormState.scheduleType as JobScheduleType,
        startDate: startDate || '',
        endDate: jobSheetFormState.endDate ? endDate : null,
    };
};

/**
 * Maps a JobFormSheetState to an UpdateJobInput.
 * @param jobSheetFormState - The JobFormSheetState to map.
 * @returns An UpdateJobInput.
 */
const mapToUpdateJobPayload = (jobSheetFormState: JobFormSheetState): UpdateJobInput => {
    const mappedTools: UpdateJobTool[] = [];

    for (const tool of jobSheetFormState.tools) {
        tool.toolId;
        switch (tool.type) {
            case 'scraper':
                mappedTools.push({
                    type: tool.type,
                    toolId: tool.toolId,
                    keywords: tool.keywords.length > 0 ? tool.keywords : undefined,
                    maxPages: 1,
                    targets: tool.targets.map(target => ({
                        target: target.target as ScraperToolTargetName,
                        targetId: target.targetId,
                        keywords: target.keywords.length > 0 ? target.keywords : undefined,
                        maxPages: 1,
                    })),
                });
                break;
            case 'email':
                mappedTools.push({
                    type: tool.type,
                    toolId: tool.toolId,
                    subject: tool.subject,
                    targets: tool.targets.map(target => ({
                        target: target.target as EmailToolTargetName,
                        targetId: target.targetId,
                        subject: target.subject,
                        body: target.body,
                    })),
                });
        }
    }

    return {
        schedule: _mapToSchedule(jobSheetFormState),
        tools: mappedTools,
        name: jobSheetFormState.name,
        runJob: jobSheetFormState.runJob,
    };
};

/**
 * Maps a JobFormSheetState to a CreateJobInput.
 * @param jobSheetFormState - The JobFormSheetState to map.
 * @returns A CreateJobInput.
 */
const mapToCreateJobPayload = (jobSheetFormState: JobFormSheetState): CreateJobInput => {
    const mappedTools: CreateJobTool[] = [];

    for (const tool of jobSheetFormState.tools) {
        switch (tool.type) {
            case 'scraper':
                mappedTools.push({
                    type: tool.type,
                    keywords: tool.keywords.length > 0 ? tool.keywords : undefined,
                    maxPages: 1,
                    targets: tool.targets.map(target => ({
                        target: target.target as ScraperToolTargetName,
                        targetId: target.targetId,
                        keywords: target.keywords.length > 0 ? target.keywords : undefined,
                        maxPages: 1,
                    })),
                });
                break;
            case 'email':
                mappedTools.push({
                    type: tool.type,
                    subject: tool.subject,
                    body: tool.body,
                    targets: tool.targets.map(target => ({
                        target: target.target as EmailToolTargetName,
                        targetId: target.targetId,
                        subject: target.subject,
                        body: target.body,
                    })),
                });
                break;
            default: {
                const _exhaustive: never = tool;
                return _exhaustive;
            }
        }
    }

    return {
        schedule: _mapToSchedule(jobSheetFormState),
        name: jobSheetFormState.name,
        tools: mappedTools,
    };
};

const mappers = {
    mapToJobFormTools,
    mapToUpdateJobPayload,
    mapToCreateJobPayload,
};

export default mappers;
