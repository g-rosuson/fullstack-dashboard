import { type VariantProps } from 'class-variance-authority';

import { buttonVariants } from '@/components/ui/button';

type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];

type ConfirmationDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    onConfirm: () => Promise<void>;
    confirmLabel?: string;
    confirmVariant?: ButtonVariant;
};

export type { ConfirmationDialogProps };
