const Spinner = () => {
    const dotClassName = 'rounded-full bg-primary-foreground p-1.5 animate-[bounce_1s_infinite_ease-in-out]';

    return (
        <div className="flex gap-2" role="progressbar" aria-busy="true" aria-label="Loading" data-testid="spinner">
            <span className={dotClassName} />
            <span className={`${dotClassName} [animation-delay:0.15s]`} />
            <span className={`${dotClassName} [animation-delay:0.35s]`} />
        </div>
    );
};

export default Spinner;
