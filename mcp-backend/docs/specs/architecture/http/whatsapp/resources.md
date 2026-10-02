# HTTP — WhatsApp resources

`POST /mcp`

## HTTP-WHATSAPP-RES-001 — List chats

- Request:
  - Modern MCP request
  - `Mcp-Method: resources/list`
  - Method: `resources/list`
- Response:
  - Status: `200`
  - `result.resources` includes:
    - `{ uri: "whatsapp://chats/family", name: "family", description: "The family chat", mimeType: "application/json" }`
    - `{ uri: "whatsapp://chats/work", name: "work", description: "The work chat", mimeType: "application/json" }`
  - `result.resources` has those two entries once each

Traces:

- [FR-WHATSAPP-RES-001](../../../requirements/fr/whatsapp/resources.md)
- [FR-WHATSAPP-RES-004](../../../requirements/fr/whatsapp/resources.md)

## HTTP-WHATSAPP-RES-002 — Read the family chat

- Request:
  - Modern MCP request
  - `Mcp-Method: resources/read`
  - Method: `resources/read`
  - `params.uri` = `whatsapp://chats/family`
- Response:
  - Status: `200`
  - `result.contents[0].uri` = `whatsapp://chats/family`
  - `result.contents[0].mimeType` = `application/json`
  - `result.contents[0].text` parses as JSON:
    - `id` = `family`
    - `title` = `Family`
    - `messages` = `[{ from: "Alex", text: "Dinner at 7?", at: "2026-10-01T17:04:00Z" }, { from: "Sam", text: "I'll be there.", at: "2026-10-01T17:06:00Z" }]`

Traces:

- [FR-WHATSAPP-RES-002](../../../requirements/fr/whatsapp/resources.md)

## HTTP-WHATSAPP-RES-003 — Unknown chat

- Request:
  - Modern MCP request
  - `Mcp-Method: resources/read`
  - Method: `resources/read`
  - `params.uri` = `whatsapp://chats/missing`
- Response:
  - Status: `200`
  - Body: `{ jsonrpc: "2.0", id: <request id>, error: { code: -32602, message: "Resource not found: whatsapp://chats/missing", data: { uri: "whatsapp://chats/missing" } } }`

Traces:

- [FR-WHATSAPP-RES-003](../../../requirements/fr/whatsapp/resources.md)

## HTTP-WHATSAPP-RES-004 — Chat template

- Request:
  - Modern MCP request
  - `Mcp-Method: resources/templates/list`
  - Method: `resources/templates/list`
- Response:
  - Status: `200`
  - `result.resourceTemplates` includes `{ name: "chat", uriTemplate: "whatsapp://chats/{chatId}", description: "A WhatsApp chat", mimeType: "application/json" }`

Traces:

- [FR-WHATSAPP-RES-004](../../../requirements/fr/whatsapp/resources.md)
