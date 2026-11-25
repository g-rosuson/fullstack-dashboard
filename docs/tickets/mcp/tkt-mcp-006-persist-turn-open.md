# TKT-MCP-006 — Keep turn open and closed

`feat/tkt-mcp-006-persist-turn-open`

Labels: `feature`

## User story

As a user, I want each turn to stay expanded or collapsed the way I last set it, including after a reload, so that I do not open or close the same turns again, and that choice is not part of the address.

## Definition of done

- [ ] [FR-MCP-CNV-012](../../specs/requirements/fr/mcp/conversation.md) is added
- [ ] [CLIENT-MCP-CNV-014](../../specs/architecture/client/mcp/conversation.md) is added and holds
- [ ] `localStorage` is used only through one wrapper in `frontend/src/services/storage`, and theme reads and writes go through that wrapper
- [ ] Opening and closing a turn are both stored with no expiry, including after logout and after the conversation is deleted
- [ ] A turn that still has a placeholder id is not stored
- [ ] Expanding or collapsing a turn does not change the address. Attached turns stay on `turnIds`
- [ ] Opening a collapsed turn from an attached chip stores that turn as open and still scrolls it into view
- [ ] The saved-events panel inside a turn is unchanged

## Traces

- [FR-MCP-CNV-012](../../specs/requirements/fr/mcp/conversation.md)
- [CLIENT-MCP-CNV-014](../../specs/architecture/client/mcp/conversation.md)
