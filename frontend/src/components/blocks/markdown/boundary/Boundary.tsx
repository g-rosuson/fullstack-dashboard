import { Component } from 'react';

import Fallback from '@/components/blocks/markdown/fallback/Fallback';

import type { BoundaryProps, BoundaryState } from './Boundary.types';

import logging from '@/services/logging';

/**
 * Catches a crash while markdown is drawing and shows the original text.
 * React only reports a render crash through a class component.
 */
class Boundary extends Component<BoundaryProps, BoundaryState> {
    state: BoundaryState = { hasError: false };

    /**
     * Switches to the plain-text fallback after a child render crash.
     */
    static getDerivedStateFromError(): BoundaryState {
        return { hasError: true };
    }

    /**
     * Records the render crash so it is not dropped.
     */
    componentDidCatch(error: Error): void {
        logging.error(error);
    }

    /**
     * Renders the markdown children, or the original text after a crash.
     */
    render() {
        if (this.state.hasError) {
            return <Fallback source={this.props.source} />;
        }

        return this.props.children;
    }
}

export default Boundary;
