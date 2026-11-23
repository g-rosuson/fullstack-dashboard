import type { ReactNode } from 'react';

interface BoundaryProps {
    source: string;
    children: ReactNode;
}

interface BoundaryState {
    hasError: boolean;
}

export type { BoundaryProps, BoundaryState };
