# HTTP — WhatsApp tools

`POST /mcp`

## HTTP-WHATSAPP-CHT-001 — List chats

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/call`
  - `Mcp-Name: whatsapp.list_chats`
  - Method: `tools/call`
  - `params.name` = `whatsapp.list_chats`
  - `params.arguments` = `{}`
- Response:
  - Status: `200`
  - `result.isError` is not `true`
  - `result.content[0].type` = `text`
  - `result.content[0].text` parses as JSON whose `chats` array is:
    - `{ id: "family", title: "Family", uri: "whatsapp://chats/family", description: "The family chat" }`
    - `{ id: "work", title: "Work", uri: "whatsapp://chats/work", description: "The work chat" }`

Traces:

- [FR-WHATSAPP-CHT-001](../../../requirements/fr/whatsapp/chats.md)
- [FR-MCP-TLS-002](../../../requirements/fr/mcp/tools.md)

## HTTP-WHATSAPP-MSG-001 — Send a message

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/call`
  - `Mcp-Name: whatsapp.send_message`
  - Method: `tools/call`
  - `params.name` = `whatsapp.send_message`
  - `params.arguments` = `{ "chat": "family", "text": "On my way" }`
- Response:
  - Status: `200`
  - `result.isError` is not `true`
  - `result.content[0]` = `{ type: "text", text: "{\"chat\":\"family\",\"text\":\"On my way\",\"status\":\"sent\"}" }`
- A following read of `whatsapp://chats/family` still matches [HTTP-WHATSAPP-RES-002](./resources.md)

Traces:

- [FR-WHATSAPP-MSG-001](../../../requirements/fr/whatsapp/chats.md)
- [FR-MCP-TLS-002](../../../requirements/fr/mcp/tools.md)

## HTTP-WHATSAPP-MSG-002 — Unknown chat

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/call`
  - `Mcp-Name: whatsapp.send_message`
  - Method: `tools/call`
  - `params.name` = `whatsapp.send_message`
  - `params.arguments` = `{ "chat": "missing", "text": "Hello" }`
- Response:
  - Status: `200`
  - `result.isError` = `true`
  - `result.content[0].text` = `Chat not found: missing`
  - No `error` member

Traces:

- [FR-WHATSAPP-MSG-002](../../../requirements/fr/whatsapp/chats.md)
