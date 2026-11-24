import { CircleCheckIcon, CircleXIcon, InfoIcon, MegaphoneIcon } from 'lucide-react';

import Spinner from '@/components/blocks/spinner/Spinner';

import type { ToastType } from './Toast.types';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ToastIconProps = {
    type?: string;
};

const iconClassName = "shrink-0 [&_svg:not([class*='size-'])]:size-(--icon-size-lg)";

const toastIcons: Record<ToastType, { icon: ReactNode; className?: string }> = {
    success: {
        icon: <CircleCheckIcon aria-hidden="true" />,
        className: 'text-success',
    },
    info: {
        icon: <InfoIcon aria-hidden="true" />,
        className: 'text-muted-foreground',
    },
    warning: {
        icon: <MegaphoneIcon aria-hidden="true" />,
        className: 'text-warning',
    },
    error: {
        icon: <CircleXIcon aria-hidden="true" />,
        className: 'text-destructive',
    },
    loading: {
        icon: <Spinner type="circle" size="md" aria-hidden="true" />,
    },
};

/**
 * Status icon for a toast type. Default (undefined / unknown) renders nothing.
 */
const ToastIcon = ({ type }: ToastIconProps) => {
    const isToastType = (type: string): type is ToastType => type in toastIcons;

    if (!type || !isToastType(type)) {
        return null;
    }

    const { icon, className } = toastIcons[type];

    return (
        <span data-slot="toast-icon" className={cn(iconClassName, className)}>
            {icon}
        </span>
    );
};

export default ToastIcon;
