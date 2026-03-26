import { defineConfig } from 'orval';

export default defineConfig({
    api: {
        input: 'http://localhost:1000/api/docs/openapi',
        output: {
            schemas: 'src/_types/_gen',
            clean: true,
        },
    },
});
