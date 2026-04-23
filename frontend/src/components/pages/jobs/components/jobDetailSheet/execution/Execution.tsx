import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import ToolPanel from './toolPanel/ToolPanel';
import Tabs from '@/components/ui-app/tabs/Tabs';

import type { CollapsibleExecutionProps } from './types/Execution.types';
import type { ExecutionTool } from '@/_types/_gen';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import utils from '@/utils';

/**
 * Execution detail: collapsible schedule info, then per-tool tabs and per-target tabs.
 * Tool kind is branched at the tool level so targets are correctly typed for each renderer.
 */
const CollapsibleExecution = ({ execution }: CollapsibleExecutionProps) => {
    // State
    const [isOpen, setIsOpen] = useState(false);

    // Determine the information section
    const information = (
        <section className="flex flex-col gap-2 border rounded-md p-3">
            <div>
                <div className="font-bold text-sm">Identifier </div>
                <span className="text-xs">{execution.executionId}</span>
            </div>

            <div>
                <div className="font-bold text-sm">Delegated at </div>
                <span className="text-xs">{new Date(execution.schedule.delegatedAt).toLocaleString()}</span>
            </div>

            <div>
                <div className="font-bold text-sm">Finished at </div>
                <span className="text-xs">{new Date(execution.schedule.finishedAt || '').toLocaleString()}</span>
            </div>
        </section>
    );

    /**
     * Maps the tools to tabs and tab contents.
     */
    const mapToTabs = (tools: ExecutionTool[]) => {
        const tabs = tools.map(tool => ({
            value: tool.toolId,
            label: utils.string.capitalize(tool.type),
        }));

        const tabContents = tools.map(tool => ({
            value: tool.toolId,
            children: <ToolPanel tool={tool} />,
        }));

        return { tabs, tabContents };
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md data-[state=open]:bg-muted">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" className="group w-full">
                    {new Date(execution.schedule.finishedAt || execution.schedule.delegatedAt).toLocaleString()}

                    <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
                </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="p-3">
                <section className="mb-3">{information}</section>

                <h2 className="font-bold text-base">
                    Tools <span className="text-sm font-normal">({execution.tools.length})</span>
                </h2>

                <Tabs tabs={mapToTabs(execution.tools).tabs} tabContents={mapToTabs(execution.tools).tabContents} />
            </CollapsibleContent>
        </Collapsible>
    );
};

export default CollapsibleExecution;
