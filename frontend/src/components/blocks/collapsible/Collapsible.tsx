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
    className?: string;
    label?: string | null;
    open: boolean;
    // eslint-disable-next-line no-unused-vars
    onOpenChange: (open: boolean) => void;
    style?: CSSProperties;
}

const Collapsible = ({ children, label = null, open, onOpenChange, className, style }: CollapsibleProps) => {
    const trigger = (
        <CollapsibleTrigger asChild>
            <Button
                variant="ghost"
                className="group w-full bg-background hover:bg-background! dark:hover:bg-background! data-[state=open]:bg-background!">
                <Flex direction="row" gap="sm" align="center">
                    <ChevronDownIcon className="transition-transform group-data-[state=open]:rotate-180" />

                    <Text size="xs" weight="bold">
                        {label}
                    </Text>
                </Flex>
            </Button>
        </CollapsibleTrigger>
    );

    return (
        <CollapsiblePrimitive
            style={style}
            open={open}
            onOpenChange={onOpenChange}
            className={cn('w-full bg-background border rounded-md drop-shadow-sm', className)}>
            {trigger}

            <CollapsibleContent className="p-md">{children}</CollapsibleContent>
        </CollapsiblePrimitive>
    );
};

export default Collapsible;
