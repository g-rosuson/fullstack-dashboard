import React from 'react';

import { cn } from '@/lib/utils';

interface AnimateProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const Animate = ({ children, className, style }: AnimateProps) => {
    return (
        <div className={cn('h-full w-full animate-fade-in', className)} style={style}>
            {children}
        </div>
    );
};

export default Animate;
