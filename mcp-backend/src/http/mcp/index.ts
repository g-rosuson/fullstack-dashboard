import routes from "./routes";
import { createHandler } from "./handler";
import { PATH } from "./constants";

const mcp = {
    path: PATH,
    routes,
    createHandler,
};

export default mcp;
