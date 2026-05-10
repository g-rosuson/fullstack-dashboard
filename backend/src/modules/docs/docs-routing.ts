import { Router } from 'express';

import constants from 'shared/constants';

import { openApiDocument } from 'services/openapi/generate-spec';

// Determine router
const router = Router();

// Determine route
router.get(constants.routes.docs.openapi, (_req, res) => res.json(openApiDocument));

export default router;
