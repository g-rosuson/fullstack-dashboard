import { ReactNode } from 'react';

import McpStream from './mcp/Mcp';

const Stream = ({ children }: { children: ReactNode }) => {
    return <McpStream>{children}</McpStream>;
};

export default Stream;
