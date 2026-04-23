import { Execution, ExecutionTool, JobTargetFinishedEvent } from '@/_types/_gen';

/**
 * Applies one `job-target-finished` stream event to `executions`.
 * Each event describes a single finished target. The server assigns one `executionId` per job run;
 * every event for that run repeats the same id so the client can merge them into one `Execution`
 * object (same shape as after the job is saved).
 */
const mapToExecutions = (executions: Execution[] | undefined, event: JobTargetFinishedEvent): Execution[] => {
    // New top-level array only; nested objects are replaced below, not mutated in place.
    const list = executions ? [...executions] : [];

    // Find the execution object for this run, or we will create one if this is the first event.
    const execIdx = list.findIndex(e => e.executionId === event.executionId);

    if (execIdx === -1) {
        // First event for this `executionId`: add a new `Execution` object (starts one tool, one target).
        return [
            ...list,
            {
                executionId: event.executionId,
                schedule: event.schedule,
                tools: [{ ...event.tool, targets: [event.target] } as ExecutionTool],
            },
        ];
    }

    const prevExec = list[execIdx];
    // Copy the tools array so the previous `Execution` object in state stays unchanged.
    const tools = [...prevExec.tools];
    // Find whether this event belongs to a tool we already have for this run (`toolId` is stable on the job).
    const toolIdx = tools.findIndex(t => t.toolId === event.tool.toolId);

    if (toolIdx === -1) {
        // First finished target for the next tool in the job: new `ExecutionTool` object.
        tools.push({ ...event.tool, targets: [event.target] } as ExecutionTool);
    } else {
        // Same tool as a previous event: append one more `ExecutionToolTarget` to its `targets` array.
        const tool = tools[toolIdx];
        tools[toolIdx] = { ...tool, targets: [...tool.targets, event.target] } as ExecutionTool;
    }

    // Swap in the updated execution object; leave all other executions as they were.
    const executionsBefore = list.slice(0, execIdx);
    const updatedExecution: Execution = { ...prevExec, tools };
    const executionsAfter = list.slice(execIdx + 1);

    return [...executionsBefore, updatedExecution, ...executionsAfter];
};

const mappers = {
    mapToExecutions,
};

export default mappers;
