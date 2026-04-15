import type React from 'react';

import { Sheet as SheetRoot } from '@/components/ui/sheet';

/**
 * The props for the Sheet component.
 */
type SheetProps = React.ComponentProps<typeof SheetRoot> & {
    children: React.ReactNode;
    className?: string;
    /** Layout width preset used by callers (e.g. job sheet). */
    width?: 'full' | 'half' | 'third';
    enableForm?: boolean;
    // eslint-disable-next-line no-unused-vars
    onFormSubmit?: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    // eslint-disable-next-line no-unused-vars
    onPrimaryButtonClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    isSubmitting?: boolean;
    primaryButtonLabel?: string;
    secondaryLabel?: string;
    onSecondaryClick?: () => void;
};

export type { SheetProps };
