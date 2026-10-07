# Config

The backend reads these at import and refuses to boot when one is missing or invalid.

- `OPENROUTER_API_KEY` — `config.openRouterApiKey`
- `OPENROUTER_MODEL` — `config.openRouterModel`
- `MCP_SERVER_URL` — `config.mcpServerUrl`. Dev and prod use `http://mcp-server:3000/mcp`, the address in [HTTP-MCP-EXP-001](../../specs/architecture/http/mcp/exposure.md)
- `MONGO_MCP_CONVERSATIONS_COLLECTION_NAME` — `config.mongoMcpConversationsCollectionName`

They are parsed in `backend/src/config/utils/validate-common.ts` from the schemas in `backend/src/config/schemas/index.ts`, and they are present in `backend/.env.dev` and `backend/.env.prod`.

The conversations collection is registered in `backend/src/aop/db/mongo/config/index.ts` with `indexKeys: { userId: 1 }` and `unique: false`. One user can keep more than one conversation ([FR-MCP-CNV-001](../../specs/requirements/fr/mcp/conversation.md)).

The exposure suite clears the backend `env_file` and never imports `config`. A process that does import `config` still needs the four values above.
