import { z } from 'zod';

import {
    accessTokenSecretSchema,
    devClientUrlSchema,
    devDomainSchema,
    mongoDbNameSchema,
    mongoUriSchema,
    nodeEnvSchema,
    prodClientUrlSchema,
    prodDomainSchema,
    refreshTokenSecretSchema,
} from '../schemas';

type NodeEnv = z.infer<typeof nodeEnvSchema>;
type DevClientUrl = z.infer<typeof devClientUrlSchema>;
type ProdClientUrl = z.infer<typeof prodClientUrlSchema>;
type DevDomain = z.infer<typeof devDomainSchema>;
type ProdDomain = z.infer<typeof prodDomainSchema>;
type AccessTokenSecret = z.infer<typeof accessTokenSecretSchema>;
type RefreshTokenSecret = z.infer<typeof refreshTokenSecretSchema>;
type MongoUri = z.infer<typeof mongoUriSchema>;
type MongoDbName = z.infer<typeof mongoDbNameSchema>;

export type {
    NodeEnv,
    DevClientUrl,
    ProdClientUrl,
    DevDomain,
    ProdDomain,
    AccessTokenSecret,
    RefreshTokenSecret,
    MongoUri,
    MongoDbName,
};
