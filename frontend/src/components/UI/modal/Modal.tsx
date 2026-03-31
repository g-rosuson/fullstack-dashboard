import { type FormEvent, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

import Button from '../button/Button';
import { Cross } from '../icons/Icons';

import type { Props } from './Modal.types';

const Modal = (props: Props) => {
    // Deconstruct props
    const {
        open,
        close,
        children,
        formRef,
        size,
        dataAttributes,
        primaryAction,
        primaryLabel,
        secondaryAction,
        secondaryLabel,
        enableForm,
        isLoading,
        disabled,
        disableEscape = false,
        disableClose = false,
    } = props;

    // Refs
    const modalRoot = useRef<HTMLElement | null>(null);
    const element = useRef(document.createElement('div'));
    const backdrop = useRef<HTMLDivElement | null>(null);
    const modal = useRef<HTMLDivElement | null>(null);
    const fadeoutClassName = 'fadeout';
    const disappearClassName = 'disappear';
    const backdropClassName =
        'fixed inset-0 z-[1002] flex w-full items-center justify-center overflow-auto bg-black/0 p-4 animate-fade-in';
    const modalBaseClassName =
        'animate-fade-in-from-top relative z-[1002] w-full rounded-md bg-surface p-4 shadow-light transition-[max-width] duration-400 will-change-[max-width]';
    const closeButtonClassName =
        'absolute top-6 right-6 z-10 flex items-center justify-center rounded-full p-3 text-xl text-foreground transition-colors hover:bg-surface-hover';
    const buttonRowClassName = 'relative mt-6 flex w-full items-center justify-end gap-2';
    const sizeClassMap: Record<NonNullable<Props['size']>, string> = {
        s: 'max-w-md',
        m: 'max-w-2xl',
        l: 'max-w-4xl',
        xl: 'max-w-6xl',
    };

    /**
     * Adds animation CSS classes to the backdrop and modal when the modal is closed.
     * And removes the modal from the DOM after the animation has completed.
     */
    const exit = (): void => {
        if (
            element.current.parentElement !== modalRoot.current ||
            !modalRoot.current ||
            !backdrop.current ||
            !modal.current
        ) {
            return;
        }

        backdrop.current?.classList.add(fadeoutClassName);
        modal.current?.classList.add(disappearClassName);

        setTimeout(() => {
            element.current.parentElement === modalRoot.current && modalRoot.current?.removeChild(element.current);
        }, 700);
    };

    /**
     * Handles form submission when "enableForm" is true. By preventing
     * the form being reset on submission and calling the "primaryAction"
     * callback function.
     */
    const onFormSubmit = (event: FormEvent) => {
        event.preventDefault();
        primaryAction?.();
    };

    /**
     * Adds a "keydown" event listener, that calls the "close" callback
     * function when "Escape" is pressed. With the expection of either
     * "disableClose" or "disableEscape" props being true.
     */
    useEffect(() => {
        const eventHandler = ({ key }: KeyboardEvent) => {
            const pressedEscape = key === 'Escape';

            const isEscapeDisabled = disableClose || disableEscape;

            if (open && pressedEscape && !isEscapeDisabled) {
                close?.();
            }
        };

        window.addEventListener('keydown', eventHandler, { passive: true });

        return () => {
            window.removeEventListener('keydown', eventHandler);
        };
    }, [open, close, disableEscape, disableClose]);

    /**
     * Removes the "fadeout" class from the backdrop element and the "disappear"
     * class from the modal element when the modal is open. And adds the modal
     * to the DOM when the modal is open.
     */
    useEffect(() => {
        if (open) {
            modalRoot.current = document.getElementById('modal');
            backdrop.current?.classList.remove(fadeoutClassName);
            modal.current?.classList.remove(disappearClassName);
            modalRoot.current?.appendChild(element.current);
        }

        return () => exit();
    }, [open]);

    // Determine modal styling
    const modalSizeClassName = sizeClassMap[size || 'm'];
    const modalClassName = clsx(modalBaseClassName, modalSizeClassName);

    // Determine button container
    const buttonContainer = (
        <div className={buttonRowClassName} data-testid="button-container" hidden={!primaryAction && !secondaryAction}>
            <Button
                label={secondaryLabel || ''}
                onClick={secondaryAction}
                hidden={!secondaryAction}
                testId="secondary-button"
            />

            <Button
                label={primaryLabel || ''}
                // Set the button type to "submit" when the form is enabled
                type={enableForm ? 'submit' : undefined}
                testId="primary-button"
                // Pass the "primaryAction" callback to the onClick when not using the form
                onClick={enableForm ? undefined : primaryAction}
                isLoading={isLoading}
                disabled={disabled || !primaryAction}
            />
        </div>
    );

    // Determine modal content without a form
    let content = (
        <>
            {children}
            {buttonContainer}
        </>
    );

    // Determine a modal wrapped in a form tag and enable HTML form validation
    if (enableForm) {
        content = (
            <form ref={formRef} data-testid="form" onSubmit={onFormSubmit}>
                {children}
                {buttonContainer}
            </form>
        );
    }

    const component = (
        <div className={backdropClassName} {...dataAttributes} ref={backdrop}>
            <div role="dialog" className={modalClassName} data-testid="modal" data-id="modal" ref={modal}>
                <button
                    className={closeButtonClassName}
                    data-testid="close-button"
                    onClick={disableClose ? undefined : close}
                    hidden={disableClose}>
                    <Cross thick />
                </button>

                {content}
            </div>
        </div>
    );

    return createPortal(component, element.current);
};

export default Modal;
