import type { ExecutionEmailTool } from '@/_types/_gen';

import EmailTarget from './EmailTarget';

type EmailToolPanelProps = {
    tool: ExecutionEmailTool;
};

const EmailToolPanel = ({ tool }: EmailToolPanelProps) => {
    return (
        <>
            <h2 className="font-bold text-base ml-3">
                Targets <span className="text-sm font-normal">({tool.targets.length})</span>
            </h2>

            <EmailTarget target={tool.targets[0]} />
        </>
    );
};

export default EmailToolPanel;
