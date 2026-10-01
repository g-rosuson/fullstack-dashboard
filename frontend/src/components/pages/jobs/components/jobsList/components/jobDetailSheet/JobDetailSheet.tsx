import { BadgeInfo } from 'lucide-react';

import Execution from './execution/Execution';
import DropdownMenu from '@/components/blocks/dropdownMenu/DropdownMenu';
import Flex from '@/components/blocks/flex/Flex';
import Sheet from '@/components/blocks/sheet/Sheet';
import Text from '@/components/blocks/text/Text';
import Title from '@/components/blocks/title/Title';
import ActionButton from '@/components/pages/jobs/components/jobsList/components/shared/components/actionButton/ActionButton';
import Schedule from '@/components/pages/jobs/components/jobsList/components/shared/components/schedule/Schedule';
import Status from '@/components/pages/jobs/components/jobsList/components/shared/components/status/Status';

import type { JobDetailSheetProps } from './types';

import constants from '@/components/pages/jobs/components/jobsList/components/jobDetailSheet/constants';

const JobDetailSheet = ({
    jobName,
    executions,
    schedule,
    status,
    menuItems,
    isSubmitting,
    isOpen,
    onOpenChange,
    onRequestConfirm,
}: JobDetailSheetProps) => {
    if (!schedule || !status || !executions) {
        return null;
    }

    // Determine executions content
    const hasExecutions = executions.length > 0;

    let executionsContent = (
        <Flex direction="column" gap="sm" align="center" justify="center">
            <BadgeInfo size={24} />

            <Title size="md" level={3}>
                {constants.label.placeholder.executions.title}
            </Title>

            <Text size="sm" variant="muted" align="center">
                {constants.label.placeholder.executions.description}
            </Text>
        </Flex>
    );

    if (hasExecutions) {
        executionsContent = (
            <>
                <Flex direction="column" gap="sm">
                    {executions.map(execution => (
                        <Execution key={execution.executionId} execution={execution} />
                    ))}
                </Flex>
            </>
        );
    }

    return (
        <Sheet
            width="xl"
            title={jobName}
            description={constants.label.ariaDescribedby}
            headerActions={<DropdownMenu items={menuItems} />}
            open={isOpen}
            onOpenChange={onOpenChange}>
            <Flex direction="column" gap="md">
                <section className="w-full">
                    <Flex direction="column" gap="md">
                        <Flex direction="column" gap="sm">
                            <Status status={status} size="xs" />

                            <Schedule schedule={schedule} size="xs" />
                        </Flex>

                        <ActionButton status={status} size="xs" isLoading={isSubmitting} onClick={onRequestConfirm} />
                    </Flex>
                </section>

                <section className="w-full">
                    <Title size="md" level={2}>
                        {constants.label.title.executions}
                    </Title>

                    {executionsContent}
                </section>
            </Flex>
        </Sheet>
    );
};

export default JobDetailSheet;
