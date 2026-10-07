import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import authRegistry from 'modules/auth/auth-registry';
import jobsRegistry from 'modules/jobs/jobs-registry';
import mcpRegistry from 'modules/mcp/mcp-registry';

// Determine registries for all relevant modules
const registries = [...authRegistry.definitions, ...jobsRegistry.definitions, ...mcpRegistry.definitions];

// Determine generator & generate document
const generator = new OpenApiGeneratorV3(registries);

export const openApiDocument = generator.generateDocument({
    openapi: '3.0.0',
    info: {
        title: 'Openapi documentation',
        version: '1.0.0',
    },
});
