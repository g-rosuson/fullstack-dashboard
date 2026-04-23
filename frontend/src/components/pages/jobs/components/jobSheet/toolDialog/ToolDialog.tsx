import React, { useEffect, useState } from 'react';

import ScraperTool from './components/scraperTool/ScraperTool';
import { ToolDialogProps, ToolType } from './types/ToolDialog.types';
import Select from '@/components/ui-app/select/Select';

import type { JobFormSheetTool } from '../types/JobSheet.types';

import constants from './constants';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const ToolDialog = ({ isOpen, toolToEdit, onOpenChange, onToolAdd, onToolEdit }: ToolDialogProps) => {
    // State
    const [tool, setTool] = useState<JobFormSheetTool | null>(null);

    /**
     * Handles the change event for the tool type select.
     */
    const onToolTypeChange = (option: { value: ToolType; label: string } | undefined) => {
        setTool(() => {
            if (option?.value === 'scraper') {
                return constants.initialScraperTool;
            }

            if (option?.value === 'email') {
                return constants.initialEmailTool;
            }

            return null;
        });
    };

    /**
     * Handles the change event for the tool.
     */
    const onToolChange = (tool: JobFormSheetTool) => {
        setTool(tool);
    };

    /**
     * Handles the submit event for the add tool form.
     */
    const onAddToolSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (toolToEdit && tool) {
            onToolEdit(tool);
        } else if (!toolToEdit && tool) {
            onToolAdd(tool);
        }
    };

    /**
     * Populates the tool state with the tool to edit when the dialog opens.
     */
    useEffect(() => {
        if (isOpen && toolToEdit) {
            setTool(toolToEdit);
        }

        return () => {
            setTool(null);
        };
    }, [toolToEdit, isOpen]);

    // Determine the tool types
    const toolOptions = [
        {
            value: 'scraper' as const,
            label: 'Scraper',
        },
        {
            value: 'email' as const,
            label: 'Email',
        },
    ];

    // Determine tool component
    let toolComponent: React.ReactNode = null;

    if (tool?.type === 'scraper') {
        toolComponent = <ScraperTool tool={tool} onChange={onToolChange} />;
    }

    // Determine if the submit button should be disabled
    const isSubmitButtonDisabled = !tool || !tool?.targets?.length;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-scroll pb-0" showCloseButton>
                <form onSubmit={onAddToolSubmit} className="flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>Add tool</DialogTitle>
                        <DialogDescription>Add a tool and its targets for your job.</DialogDescription>
                    </DialogHeader>

                    <Select
                        className="w-full"
                        label="Tool type"
                        options={toolOptions}
                        id="tool-type-field"
                        value={tool?.type || ''}
                        placeholder="Select a tool type..."
                        onChange={onToolTypeChange}
                    />

                    {toolComponent}

                    <DialogFooter className="sticky bottom-0 left-0 right-0 mt-6">
                        <Button type="submit" variant="default" disabled={isSubmitButtonDisabled}>
                            Add tool
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ToolDialog;
