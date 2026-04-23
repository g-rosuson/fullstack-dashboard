import type { ExecutionEmailToolTarget } from '@/_types/_gen';

type EmailTargetProps = {
    target: ExecutionEmailToolTarget;
};

const EmailTarget = ({ target }: EmailTargetProps) => {
    return (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Email tool results (scaffold)</span>
            <span className="text-xs">Target: {String(target.target)}</span>
        </div>
    );
};

export default EmailTarget;
