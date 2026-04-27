import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import ToolPanel from './toolPanel/ToolPanel';
import Heading from '@/components/ui-app/heading/Heading';
import Tabs from '@/components/ui-app/tabs/Tabs';
import Text from '@/components/ui-app/text/Text';

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
                <Heading level={3} size="xs">
                    Identifier
                </Heading>
                <Text size="xs">{execution.executionId}</Text>
            </div>

            <div>
                <Heading level={3} size="xs">
                    Delegated at
                </Heading>
                <Text size="xs">{new Date(execution.schedule.delegatedAt).toLocaleString()}</Text>
            </div>

            <div>
                <Heading level={3} size="xs">
                    Finished at
                </Heading>
                <Text size="xs">{new Date(execution.schedule.finishedAt || '').toLocaleString()}</Text>
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
                    <Text size="xs" appearance="foreground">
                        {new Date(execution.schedule.finishedAt || execution.schedule.delegatedAt).toLocaleString()}
                    </Text>

                    <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
                </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="p-3">
                <section className="mb-3">{information}</section>

                <Heading size="s" level={2}>
                    Tools <span className="text-sm font-normal">({execution.tools.length})</span>
                </Heading>

                <Tabs tabs={mapToTabs(execution.tools).tabs} tabContents={mapToTabs(execution.tools).tabContents} />
            </CollapsibleContent>
        </Collapsible>
    );
};

export default CollapsibleExecution;
