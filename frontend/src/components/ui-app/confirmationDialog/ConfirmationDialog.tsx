import { useState } from 'react';

import type { ConfirmationDialogProps } from './ConfirmationDialog.types';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const ConfirmationDialog = ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmLabel = 'Confirm',
    confirmVariant = 'default',
}: ConfirmationDialogProps) => {
    const [isConfirming, setIsConfirming] = useState(false);

    /**
     * Awaits the onConfirm callback and closes the dialog on success.
     */
    const handleConfirm = async () => {
        try {
            setIsConfirming(true);
            await onConfirm();
        } catch {
            // Set local UI state here.
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} aria-describedby={description ? undefined : description}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription size="s">{description}</DialogDescription>}
                </DialogHeader>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isConfirming}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button variant={confirmVariant} onClick={handleConfirm} disabled={isConfirming}>
                        {isConfirming ? <Spinner /> : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmationDialog;
