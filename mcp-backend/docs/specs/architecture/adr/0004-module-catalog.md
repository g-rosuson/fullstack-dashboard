# ADR-0004 — Domain modules and a unique tool catalog

Status: accepted

## Context

MCP addresses tools by one name. The HTTP process should not grow a route per tool.

## Decision

A domain module exposes `name`, `toolNames`, and `register`. `toolNames` must match the tools `register` adds. The process enrolls one list and rejects a duplicate module or tool name before it accepts traffic. WhatsApp is the reference module. Its tools and listed chats carry the module id in `_meta.domain`, because `tools/list` does not return that id. Tool names are short. A chat is read by its URI.

Behavior: [FR-MCP-CAT-001](../../requirements/fr/mcp/catalog.md), [FR-MCP-TLS-001](../../requirements/fr/mcp/tools.md), [FR-WHATSAPP-RES-001](../../requirements/fr/whatsapp/resources.md).
