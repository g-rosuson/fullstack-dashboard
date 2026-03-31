import React from 'react';
import clsx from 'clsx';

import { Props } from './Heading.types';

const Heading = ({ size, level, children, removeMargin }: Props) => {
    // Determine the heading classname based on the provided size
    const className = clsx(
        'leading-none font-bold text-foreground',
        removeMargin ? 'm-0' : 'mt-8 mb-8',
        size === 'l' && 'mb-4 text-3xl font-bold',
        size === 'm' && 'mb-2 text-lg font-bold',
        size === 's' && 'mb-2 text-sm font-bold',
        !size && 'text-4xl font-black'
    );


    // Determine the heading element based on the provided level
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;


    return (
        <Tag className={className} data-remove-margin={removeMargin}>
            {children}
        </Tag>
    );
};

export default Heading;