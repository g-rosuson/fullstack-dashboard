import { CSSProperties, ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';

import { Button } from '@/components/ui/button';
import { CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Collapsible as CollapsiblePrimitive } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface CollapsibleProps {
    children: ReactNode;
    action?: ReactNode;
    className?: string;
    label?: string | null;
    open: boolean;
    // eslint-disable-next-line no-unused-vars
    onOpenChange: (open: boolean) => void;
    style?: CSSProperties;
}

const Collapsible = ({
    children,
    action = null,
    label = null,
    open,
    onOpenChange,
    className,
    style,
}: CollapsibleProps) => {
    const trigger = (
        <CollapsibleTrigger asChild>
            <Button
                variant="ghost"
                className="group w-full min-w-0 justify-start overflow-hidden bg-background hover:bg-background! dark:hover:bg-background! data-[state=open]:bg-background!">
                <Flex direction="row" gap="sm" align="center" className="min-w-0 w-auto flex-1">
                    <ChevronDownIcon className="shrink-0 transition-transform group-data-[state=open]:rotate-180" />

                    {!open && label ? (
                        <Text as="span" size="xs" weight="bold" className="min-w-0 truncate">
                            {label}
                        </Text>
                    ) : null}
                </Flex>

                {action}
            </Button>
        </CollapsibleTrigger>
    );

    return (
        <CollapsiblePrimitive
            style={style}
            open={open}
            onOpenChange={onOpenChange}
            className={cn('w-full bg-background border rounded-md', className)}>
            {trigger}

            <CollapsibleContent className="p-md">{children}</CollapsibleContent>
        </CollapsiblePrimitive>
    );
};

export default Collapsible;
