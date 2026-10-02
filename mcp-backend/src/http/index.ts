import request from "./request";
import health from "./health";
import mcp from "./mcp";
import onError from "./error";

const http = {
    request,
    health,
    mcp,
    onError,
};

export default http;
