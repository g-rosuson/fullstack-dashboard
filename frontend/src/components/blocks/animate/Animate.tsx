import React from 'react';

interface AnimateProps {
    children: React.ReactNode;
}

const Animate = ({ children }: AnimateProps) => {
    return <div className="h-full w-full animate-fade-in">{children}</div>;
};

export default Animate;
