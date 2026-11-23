import React from 'react';
import { cva } from 'class-variance-authority';

import Flex from '@/components/blocks/flex/Flex';

import { surfaceDescription } from '@/components/blocks/shared/variants/typography/recipes';
import { titleVariants } from '@/components/blocks/shared/variants/typography/title.variants';
import {
    Card as CardPrimitive,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const cardMinWidth = cva('', {
    variants: {
        minWidth: {
            xs: 'min-w-xs',
            sm: 'min-w-sm',
            md: 'min-w-md',
            lg: 'min-w-lg',
        },
    },
});

interface CardProps {
    title: React.ReactNode;
    titleSize?: 'xs' | 'sm' | 'md' | 'lg';
    titleAddon?: React.ReactNode;
    description?: string;
    headerActions?: React.ReactNode;
    footer?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    minWidth?: 'xs' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const Card = ({
    title,
    titleSize = 'lg',
    titleAddon,
    description,
    headerActions,
    footer,
    children,
    className,
    minWidth,
    onClick,
}: CardProps) => {
    let descriptionContent = null;

    if (description) {
        descriptionContent = <CardDescription className={surfaceDescription()}>{description}</CardDescription>;
    }

    let headerActionsContent = null;

    if (headerActions) {
        headerActionsContent = <CardAction onClick={event => event.stopPropagation()}>{headerActions}</CardAction>;
    }

    let childrenContent = null;

    if (children) {
        childrenContent = <CardContent>{children}</CardContent>;
    }

    let footerContent = null;

    if (footer) {
        footerContent = <CardFooter>{footer}</CardFooter>;
    }

    return (
        <CardPrimitive
            className={cn(onClick && 'cursor-pointer', cardMinWidth({ minWidth }), className)}
            onClick={onClick}>
            <CardHeader>
                <Flex direction="column" gap="xs" className="min-w-0">
                    <CardTitle className={cn(titleVariants({ size: titleSize }), 'min-w-0 truncate')}>
                        {title}
                    </CardTitle>

                    {titleAddon}
                </Flex>

                {descriptionContent}

                {headerActionsContent}
            </CardHeader>

            {childrenContent}

            {footerContent}
        </CardPrimitive>
    );
};

export default Card;

export type { CardProps };
