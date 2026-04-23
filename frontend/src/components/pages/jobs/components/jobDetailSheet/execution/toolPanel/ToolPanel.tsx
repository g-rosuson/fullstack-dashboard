import EmailToolPanel from './email/EmailToolPanel';
import ScraperToolPanel from './scraper/ScraperToolPanel';

import type { ExecutionTool } from '@/_types/_gen';

interface ToolPanelProps {
    tool: ExecutionTool;
}

const ToolPanel = ({ tool }: ToolPanelProps) => {
    if (tool.type === 'scraper') {
        return <ScraperToolPanel tool={tool} />;
    }

    return <EmailToolPanel tool={tool} />;
};

export default ToolPanel;
