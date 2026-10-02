# MCP protocol

- **FR-MCP-PRT-001** — The system shall accept an MCP request that names protocol revision `2026-07-28` and includes the per-request client envelope.
- **FR-MCP-PRT-002** — The system shall reject an MCP request that does not name protocol revision `2026-07-28`.
- **FR-MCP-PRT-003** — The system shall answer an accepted MCP request with a single JSON body and shall not leave a stream open for that response.
- **FR-MCP-PRT-004** — The system shall answer a client's first MCP request without a previous handshake or session.
- **FR-MCP-PRT-005** — The system shall refuse a request to open or close a long-lived MCP session.
- **FR-MCP-PRT-006** — The system shall identify itself on a successful MCP result with the package name and version.
- **FR-MCP-PRT-007** — The system shall accept a valid MCP request that presents no caller credential.
- **FR-MCP-PRT-008** — The system shall reject an MCP request body that is not valid JSON.
- **FR-MCP-PRT-009** — The system shall reject an MCP request whose content type is not JSON.
