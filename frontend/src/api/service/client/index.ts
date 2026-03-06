import { del, get, post, put } from './rest';
import { stream } from './stream';

const client = {
    get,
    post,
    put,
    del,
    stream,
};

export default client;
