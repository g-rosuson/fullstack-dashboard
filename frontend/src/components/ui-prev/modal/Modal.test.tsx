import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Modal from './Modal';
import { type Props } from './Modal.types';

/**
 * Renders the modal with the given props into the JS-DOM and returns testing utilities.
 */
const setupModal = (props: Partial<Props> = {}) => {
    return render(<Modal open={true} {...props}>Children</Modal>);
};

describe('Modal Component', () => {
    let closeMock: ReturnType<typeof vi.fn>;
    let primaryActionMock: ReturnType<typeof vi.fn>;
    let secondaryActionMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        closeMock = vi.fn();
        primaryActionMock = vi.fn();
        secondaryActionMock = vi.fn();

        // Mocks ReactDOM.createPortal to render the modal content directly
        // in the test DOM, This ensures elements inside the modal can be
        // accessed normally using testing-library queries.
        vi.mock('react-dom', async () => ({ createPortal: (node: React.ReactNode) => node }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Test "close" callback function
    it('"close" callback function is invoked when "Escape" key is pressed', async () => {
        setupModal({ close: closeMock });
        await userEvent.keyboard('[Escape]');
        expect(closeMock).toHaveBeenCalledTimes(1);
    });

    it('skips invoking the "close" callback function when "Escape" is pressed and "disableEscape" is true', async () => {
        setupModal({ close: closeMock, disableEscape: true });
        await userEvent.keyboard('[Escape]');
        expect(closeMock).not.toHaveBeenCalled();
    });

    it('skips invoking the "close" callback function when "Escape" is pressed and "disableClose" is true', async () => {
        setupModal({ close: closeMock, disableClose: true });
        await userEvent.keyboard('[Escape]');
        expect(closeMock).not.toHaveBeenCalled();
    });

    it('skips invoking the "close" callback function when "disableClose" is true', async () => {
        setupModal({ close: closeMock, disableClose: true });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('secondary-button');
        await userEvent.click(button);
        expect(closeMock).not.toHaveBeenCalled();
    });

    it('"close" callback function is invoked when the "X" close button is pressed', async () => {
        setupModal({ close: closeMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('close-button');
        await userEvent.click(button);
        expect(closeMock).toHaveBeenCalledTimes(1);
    });

    it('skips invoking the "close" callback function with the "X" close button when "disableClose" is true', async () => {
        setupModal({ close: closeMock, disableClose: true });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('close-button');
        await userEvent.click(button);
        expect(closeMock).not.toHaveBeenCalled();
    });

    // Test "primaryAction" & "secondaryAction" callback functions
    it('"primaryAction" callback function is invoked when its defined', async () => {
        setupModal({ primaryAction: primaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        await userEvent.click(button);
        expect(primaryActionMock).toHaveBeenCalledTimes(1);
    });

    it('"secondaryAction" callback function is invoked when its defined', async () => {
        setupModal({ secondaryAction: secondaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('secondary-button');
        await userEvent.click(button);
        expect(secondaryActionMock).toHaveBeenCalledTimes(1);
    });

    // Test visibility of button container
    it('button container is visible when "primaryAction" is passed to the modal', () => {
        setupModal({ primaryAction: primaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const btnContainer = within(modalContainer).getByTestId('button-container');
        expect(btnContainer).toBeVisible();
    });

    it('button container is visible when "secondaryAction" is passed to the modal', () => {
        setupModal({ secondaryAction: secondaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const btnContainer = within(modalContainer).getByTestId('button-container');
        expect(btnContainer).toBeVisible();
    });

    it('button container is hidden when "primaryAction" and "secondaryAction" are undefined', () => {
        setupModal();
        const modalContainer = screen.getByTestId('modal');
        const btnContainer = within(modalContainer).getByTestId('button-container');
        expect(btnContainer).not.toBeVisible();
    });

    // Test visibility of primary button
    it('primary button is visible when "primaryAction" is passed to the modal', () => {
        setupModal({ primaryAction: primaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        expect(button).toBeVisible();
    });

    it('primary button is hidden when "primaryAction" is undefined', () => {
        setupModal();
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        expect(button).not.toBeVisible();
    });

    // Test visibility of secondary button
    it('secondary button is visible when "secondaryAction" is passed to the modal', () => {
        setupModal({ secondaryAction: secondaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('secondary-button');
        expect(button).toBeVisible();
    });

    it('secondary button is hidden when "secondaryAction" is undefined', () => {
        setupModal({ close: closeMock, disableClose: true });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('secondary-button');
        expect(button).not.toBeVisible();
    });

    // Test visibility of "X" close button
    it('"X" close button is visible when "disableClose" is undefined', () => {
        setupModal({ close: closeMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('close-button');
        expect(button).toBeVisible();
    });

    it('"X" close button is visible when "disableClose" is false', () => {
        setupModal({ close: closeMock, disableClose: false });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('close-button');
        expect(button).toBeVisible();
    });

    it('"X" close button is hidden when "disableClose" is "true"', () => {
        setupModal({ close: closeMock, disableClose: true });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('close-button');
        expect(button).not.toBeVisible();
    });

    // Test modal form and its elements
    it('form element is in the document when "enableForm" is true', () => {
        setupModal({ enableForm: true });
        const form = screen.getByTestId('form');
        expect(form).toBeInTheDocument();
    });

    it('button-container is wrapped in a form tag when "enableForm" is true', () => {
        setupModal({ enableForm: true });
        const form = screen.getByTestId('form');
        const buttonContainer = within(form).getByTestId("button-container");
        expect(buttonContainer).toBeInTheDocument();
    });

    it('modal children is wrapped in a form tag when "enableForm" is true', () => {
        setupModal({ enableForm: true });
        const form = screen.getByTestId('form');
        const children = within(form).getByText("Children");
        expect(children).toBeInTheDocument();
    });

    it('"primaryButton" has "type" attribute with the value "submit" when "enableForm" is true', () => {
        setupModal({ enableForm: true });
        const form = screen.getByTestId('form');
        const button = within(form).getByTestId('primary-button');
        expect(button).toHaveAttribute('type', 'submit');
    });

    // Test primary button
    it('"primaryButton" invokes "onClick" callback function when "enableForm" is false and "primaryAction" is defined', async () => {
        setupModal({ primaryAction: primaryActionMock, enableForm: false });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        await userEvent.click(button);
        expect(primaryActionMock).toHaveBeenCalledTimes(1);
    });

    it('primary button is disabled when "disabled" is true', () => {
        setupModal({ disabled: true });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        expect(button).toBeDisabled();
    });

    it('primary button is disabled when "disabled" is false and "primaryAction" is undefined', () => {
        setupModal({ disabled: false });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        expect(button).toBeDisabled();
    });

    it('primary button is enabled when "disabled" is false and "primaryAction" is defined', () => {
        setupModal({ disabled: false, primaryAction: primaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        expect(button).not.toBeDisabled();
    });

    it('primary button is enabled when "disabled" is undefined and "primaryAction" is defined', () => {
        setupModal({ primaryAction: primaryActionMock });
        const modalContainer = screen.getByTestId('modal');
        const button = within(modalContainer).getByTestId('primary-button');
        expect(button).not.toBeDisabled();
    });
});

