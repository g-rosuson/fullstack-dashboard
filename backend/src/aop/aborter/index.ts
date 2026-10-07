/**
 * Per-run cancellation handle.
 *
 * Callers thread {@link Aborter.signal} into in-flight work. Stop calls {@link Aborter.cancel}.
 * Delegator uses one per running job. PromptRunner uses one per prompt.
 */
export class Aborter {
    private controller = new AbortController();

    /**
     * AbortSignal threaded into in-flight work.
     */
    get signal(): AbortSignal {
        return this.controller.signal;
    }

    /**
     * Whether cancellation has been requested.
     */
    get cancelled(): boolean {
        return this.signal.aborted;
    }

    /**
     * Request cancellation. Idempotent.
     */
    cancel(): void {
        this.controller.abort();
    }
}
