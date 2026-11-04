import connect from './connect.config';
import features from './features.config';
import { buildConversationUrl, routes } from './routes.config';

const config = {
    connect,
    features,
    routes,
};

export default config;

export { buildConversationUrl };
