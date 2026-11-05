import { useRef, useState } from 'react';

import Button from '@/components/blocks/button/Button';
import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import type { McpPermissionInput } from '@/_types/_gen';

import constants from './constants';
import api from '@/api';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';

interface WithPermissionProps {
    label: string;
    promptId: string;
    domain: string;
    name: string;
    kind: McpPermissionInput['kind'];
}

type PendingAction = 'allow' | 'deny' | null;

interface WithPermissionState {
    isLoading: boolean;
    pendingAction: PendingAction;
}

const initialState: WithPermissionState = {
    isLoading: false,
    pendingAction: null,
};

// TODO: should permission component be bg-surface?

const WithPermission = ({ label, promptId, domain, name, kind }: WithPermissionProps) => {
    const [state, setState] = useState<WithPermissionState>(initialState);
    const isSubmittingRef = useRef(false);

    /**
     * Allows or refuses the open ask.
     * The stream replaces this ask, so a success leaves the stored turn unchanged.
     */
    const submit = async (pendingAction: Exclude<PendingAction, null>) => {
        if (isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;

        try {
            setState(prev => ({ ...prev, isLoading: true, pendingAction }));

            const payload: McpPermissionInput = { domain, name, kind };

            if (pendingAction === 'allow') {
                await api.service.resources.mcp.permit(promptId, payload);
            } else {
                await api.service.resources.mcp.refuse(promptId, payload);
            }
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                title: constants.toast.errorTitle,
                description: error instanceof CustomError ? error.message : constants.toast.errorDescription,
                type: toastConstants.type.error,
            });
        } finally {
            isSubmittingRef.current = false;
            setState(prev => ({ ...prev, isLoading: false, pendingAction: null }));
        }
    };

    const onAllow = () => {
        void submit('allow');
    };

    const onDeny = () => {
        void submit('deny');
    };

    return (
        <Flex
            gap="sm"
            direction="row"
            justify="between"
            align="center"
            className="px-md py-sm bg-surface border border-border rounded-md">
            <Text size="xs">{label}</Text>

            <Flex direction="row" gap="xs" className="w-fit">
                <Button
                    variant="secondary"
                    label={constants.label.allow}
                    size="xs"
                    onClick={onAllow}
                    isLoading={state.pendingAction === 'allow'}
                    disabled={state.isLoading}
                />
                <Button
                    variant="ghost"
                    label={constants.label.deny}
                    size="xs"
                    onClick={onDeny}
                    isLoading={state.pendingAction === 'deny'}
                    disabled={state.isLoading}
                />
            </Flex>
        </Flex>
    );
};

export default WithPermission;
