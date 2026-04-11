import React from 'react';
import { VariantProps } from 'class-variance-authority';

import { headingVariants } from './Heading';

type Level = 1 | 2 | 3;

type HeadingProps = VariantProps<typeof headingVariants> & {
    level: Level;
    children: React.ReactNode;
    className?: string;
};

export type { HeadingProps };
