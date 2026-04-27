import React, { useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';

import ToolDialog from './toolDialog/ToolDialog';
import DatePicker from '@/components/ui-app/datePicker/DatePicker';
import DropdownMenu from '@/components/ui-app/dropdownMenu/DropdownMenu';
import Field from '@/components/ui-app/field/Field';
import Select from '@/components/ui-app/select/Select';
import Sheet from '@/components/ui-app/sheet/Sheet';
import Text from '@/components/ui-app/text/Text';

import mappers from './mappers';

import type { JobFormSheetProps, JobFormSheetState, JobFormSheetTool } from './types/JobSheet.types';

import { JobScheduleType } from '@/_types/_gen';
import { Button } from '@/components/ui/button';
import { DialogTitle } from '@/components/ui/dialog';
import { FieldLabel } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import utils from '@/utils';

const JobFormSheet = ({ job, isOpen, onOpenChange, onCreateJob, onUpdateJob }: JobFormSheetProps) => {
    // State
    const [state, setState] = useState<JobFormSheetState>({
        name: '',
        scheduleType: '',
        startDate: undefined,
        startTime: '',
        endDate: undefined,
        endTime: '',
        tools: [],
        toolToEdit: null,
        isEditing: !!job,
        isSubmitting: false,
        isToolDialogOpen: false,
        runJob: false,
    });

    /**
     * Toggles the adding tool dialog.
     */
    const toggleToolDialog = (toolToEdit: JobFormSheetTool | null = null) => {
        setState(prev => ({ ...prev, isToolDialogOpen: !prev.isToolDialogOpen, toolToEdit }));
    };

    /**
     * Toggles the run job switch.
     */
    const toggleRunJobSwitch = () => {
        setState(prev => ({ ...prev, runJob: !prev.runJob }));
    };

    /**
     * Handles the change event for the given field.
     */
    const onFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    /**
     * Handles the change event for the schedule type select.
     */
    const onScheduleTypeChange = (option: { value: JobScheduleType; label: string } | undefined) => {
        const hasScheduleType = !!option?.value;

        setState(prev => ({
            ...prev,
            scheduleType: option?.value || '',
            ...(!hasScheduleType && {
                startDate: undefined,
                startTime: '',
                endDate: undefined,
                endTime: '',
            }),
        }));
    };

    /**
     * Adds the given tool to the list of added tools and closes the dialog.
     */
    const onToolAdd = (tool: JobFormSheetTool) => {
        setState(prev => ({
            ...prev,
            isToolDialogOpen: false,
            tools: [...prev.tools, tool],
        }));
    };

    /**
     * Edits the given tool in the list of added tools.
     */
    const onToolEdit = (tool: JobFormSheetTool) => {
        setState(prev => ({
            ...prev,
            tools: prev.tools.map(t => (t.toolId === tool.toolId ? tool : t)),
            isToolDialogOpen: false,
        }));
    };

    /**
     * Removes the given tool from the list of added tools.
     */
    const onToolRemove = (index: number) => {
        setState(prev => ({
            ...prev,
            tools: prev.tools.filter((_, i) => i !== index),
        }));
    };

    /**
     * Handles the change event for the given date field.
     * @param name - The name of the date field to update.
     * @param date - The date value to update the field with.
     */
    const onDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setState(prev => ({ ...prev, [name]: date ? date : undefined }));
    };

    /**
     * Handles the submit event for the form.
     */
    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        try {
            e.preventDefault();

            setState(prev => ({ ...prev, isSubmitting: true }));

            if (state.isEditing) {
                await onUpdateJob(mappers.mapToUpdateJobPayload(state));
            } else {
                await onCreateJob(mappers.mapToCreateJobPayload(state));
            }

            setState(prev => ({ ...prev, isSubmitting: false }));
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * Returns the tool item options for the given tool.
     */
    const getToolItemOptions = (index: number, tool: JobFormSheetTool) => [
        {
            label: 'Edit',
            onClick: () => toggleToolDialog(tool),
        },
        {
            label: 'Delete',
            variant: 'destructive' as const,
            onClick: () => onToolRemove(index),
        },
    ];

    /**
     * Populates the form fields from the job prop when the sheet opens.
     */
    useEffect(() => {
        if (isOpen) {
            setState(prev => {
                const startDate = job?.schedule?.startDate;
                const endDate = job?.schedule?.endDate;
                const startTime = utils.time.getTimeFromDate(job?.schedule?.startDate || '') || '';
                const endTime = utils.time.getTimeFromDate(job?.schedule?.endDate || '') || '';
                return {
                    ...prev,
                    name: job?.name || '',
                    tools: mappers.mapToJobFormTools(job?.tools || []),
                    scheduleType: job?.schedule?.type || '',
                    startDate: startDate ? new Date(startDate) : undefined,
                    startTime,
                    endDate: endDate ? new Date(endDate) : undefined,
                    endTime,
                    isEditing: !!job,
                };
            });
        }
    }, [isOpen, job]);

    // Determine the schedule type options
    const scheduleTypeOptions = Object.values(JobScheduleType).map(type => ({
        value: type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
    }));

    // Determine title
    const title = state.isEditing ? 'Edit job' : 'Create job';
    const submitLabel = state.isEditing ? 'Edit' : 'Create';

    const customSheet = (
        <Sheet
            open={isOpen}
            onOpenChange={onOpenChange}
            onFormSubmit={onFormSubmit}
            primaryButtonLabel={submitLabel}
            enableForm>
            <div>
                <DialogTitle size="l">{title}</DialogTitle>

                <div className="flex flex-col gap-5">
                    <section>
                        <Field
                            name="name"
                            label="Name"
                            type="text"
                            placeholder="Job name"
                            value={state.name}
                            onChange={onFieldChange}
                            required
                        />
                    </section>

                    <section>
                        <DialogTitle className="mb-3">Tools</DialogTitle>

                        <div className="flex flex-col gap-3">
                            <Button
                                type="button"
                                size="xs"
                                aria-label="Add tool"
                                onClick={() => toggleToolDialog()}
                                className="w-fit">
                                <PlusIcon />
                                Add tool
                            </Button>

                            {state.tools.map((tool, index) => (
                                <Item key={index} variant="outline" className="bg-muted">
                                    <ItemContent>
                                        <ItemTitle>{tool.type}</ItemTitle>
                                    </ItemContent>

                                    <ItemActions>
                                        <DropdownMenu dropdownItems={getToolItemOptions(index, tool)} />
                                    </ItemActions>
                                </Item>
                            ))}
                        </div>
                    </section>

                    <section>
                        <DialogTitle>Schedule</DialogTitle>

                        <div className="flex flex-col gap-3">
                            <Select
                                label="Type"
                                options={scheduleTypeOptions}
                                id="schedule-type"
                                value={state.scheduleType}
                                placeholder="Select a schedule type..."
                                onChange={onScheduleTypeChange}
                                className="w-full"
                            />

                            <div className="flex flex-col items-center gap-3 sm:flex-row">
                                <DatePicker
                                    label="Start date"
                                    placeholder="Pick a start date"
                                    value={state.startDate}
                                    onChange={value => onDateChange('startDate', value)}
                                    disabled={!state.scheduleType}
                                    required={!!state.scheduleType}
                                />

                                <Field
                                    name="startTime"
                                    label="Start time"
                                    type="time"
                                    placeholder="Pick a start time"
                                    value={state.startTime}
                                    onChange={onFieldChange}
                                    disabled={!state.scheduleType}
                                    required={!!state.scheduleType}
                                />
                            </div>

                            <div className="flex flex-col items-center gap-3 sm:flex-row">
                                <DatePicker
                                    label="End date"
                                    placeholder="Pick an end date"
                                    value={state.endDate}
                                    onChange={value => onDateChange('endDate', value)}
                                    disabled={!state.scheduleType}
                                />

                                <Field
                                    name="endTime"
                                    label="End time"
                                    type="time"
                                    placeholder="Pick an end time"
                                    value={state.endTime}
                                    onChange={onFieldChange}
                                    disabled={!state.scheduleType}
                                />
                            </div>
                        </div>
                    </section>

                    {state.isEditing && !state.scheduleType && (
                        <section className="flex flex-col gap-3">
                            <DialogTitle>Actions</DialogTitle>

                            <div className="flex items-start gap-3">
                                <Switch
                                    id="run-job-switch"
                                    size="sm"
                                    disabled={state.isSubmitting || !!state.scheduleType}
                                    checked={state.runJob}
                                    onCheckedChange={toggleRunJobSwitch}
                                />
                                <div className="flex flex-col items-start gap-2">
                                    <FieldLabel htmlFor="run-job-switch" className="leading-none">
                                        Run job
                                    </FieldLabel>

                                    <Text size="s" appearance="muted">
                                        Re-run all tools for the job and aggregate the results, this is only applicable
                                        if the job has no schedule.
                                    </Text>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <ToolDialog
                isOpen={state.isToolDialogOpen}
                onOpenChange={() => toggleToolDialog()}
                toolToEdit={state.toolToEdit}
                onToolAdd={onToolAdd}
                onToolEdit={onToolEdit}
            />
        </Sheet>
    );

    return customSheet;
};

export default JobFormSheet;
