# AI Agent Requirements — Repository-Specific AI Documentation

## Objective

Analyze the repository and generate project-specific AI instruction documentation for Cursor.

The agent MUST create deterministic, production-grade `.cursor/rules/*.mdc` documentation based on the actual repository implementation, architecture, tooling, and conventions.

The generated documentation MUST reflect real repository behavior and MUST NOT invent unsupported patterns.

---

# Primary Goal

The agent MUST:
1. inspect the repository
2. infer actual conventions
3. document enforceable standards
4. generate scoped Cursor rule files
5. create procedural workflows
6. encode architectural and operational constraints

The output must optimize AI-assisted development quality and consistency.

---

# Required Repository Analysis

The agent MUST analyze:

## Stack
Identify:
- frameworks
- runtimes
- package manager
- ORM
- testing libraries
- build tooling
- deployment platform
- state management
- validation libraries

Examples:
- Next.js
- React
- TypeScript
- Prisma
- Tailwind
- pnpm
- Vercel
- Vitest
- Playwright
- Zod

---

# Architecture Analysis

The agent MUST infer:
- folder organization
- dependency direction
- service boundaries
- API structure
- data access patterns
- state management patterns
- server/client separation
- feature organization
- shared package strategy

---

# Convention Analysis

The agent MUST inspect:
- naming conventions
- file naming patterns
- component structure
- hook patterns
- API implementation patterns
- error handling conventions
- logging conventions
- validation patterns
- testing conventions

Only document patterns that already exist or are clearly dominant.

---

# Command Discovery

The agent MUST discover and document:
- lint commands
- test commands
- typecheck commands
- build commands
- dev commands
- migration commands

Commands MUST come from actual repo configuration.

---

# Deployment Analysis

The agent MUST detect:
- deployment platform
- runtime constraints
- edge/serverless usage
- environment variable strategy
- caching strategy
- CI/CD tooling

Examples:
- Vercel
- Docker
- Cloudflare
- GitHub Actions

---

# Required Output Structure

```txt
.cursor/
├── rules/
│   ├── global.mdc
│   ├── architecture.mdc
│   ├── coding-standards.mdc
│   ├── testing.mdc
│   ├── security.mdc
│   ├── frontend.mdc
│   ├── backend.mdc
│   ├── database.mdc
│   └── deployment.mdc
│
├── workflows/
│   ├── add-feature.mdc
│   ├── fix-bug.mdc
│   ├── add-endpoint.mdc
│   ├── add-migration.mdc
│   └── review-pr.mdc
│
└── examples/
    ├── api-patterns.md
    ├── service-patterns.md
    └── test-patterns.md
```

---

# Required Rule Standards

All generated rules MUST:
- be deterministic
- avoid vague language
- use operational instructions
- use concise formatting
- remain scoped by concern
- avoid narrative prose
- avoid speculative recommendations

---

# Required `.mdc` Format

Every `.mdc` file MUST follow:

```md
---
description:
globs:
alwaysApply:
---

# Purpose

# Rules

# Required Commands

# Workflow

# Examples

# Anti-Patterns

# Checklist
```

---

# Required Instruction Style

Use:
- imperative language
- explicit constraints
- DO / DO NOT formatting
- executable commands
- canonical examples

Avoid:
- "prefer"
- "usually"
- "try to"
- speculative language
- philosophical explanations

---

# Required Safety Constraints

The generated documentation MUST include explicit prohibitions against:
- secrets exposure
- unsafe migrations
- bypassing authentication
- disabling tests
- unsafe production modifications
- destructive schema changes
- unsupported runtime APIs

Constraints MUST reflect actual platform/runtime limitations.

---

# Required Workflow Generation

Workflow documents MUST be procedural and repository-specific.

They MUST define:
- ordered implementation steps
- validation commands
- testing requirements
- completion criteria

Workflows MUST reflect actual project architecture.

---

# Required Example Generation

Examples MUST be derived from real repository patterns.

The agent MUST generate examples for:
- API handlers
- services
- repositories
- React components
- hooks
- tests
- validation schemas
- error handling

Do NOT invent alternative architectures.

---

# Required Platform Awareness

If the repository uses platforms such as:
- Vercel
- Cloudflare
- AWS Lambda
- Docker
- Kubernetes

the agent MUST document:
- runtime constraints
- deployment limitations
- supported APIs
- environment handling
- caching behavior
- execution limitations

---

# Required Monorepo Awareness

If the repository is a monorepo, the agent MUST:
- generate scoped glob patterns
- separate package-specific rules
- document shared package boundaries
- document dependency direction

---

# Exclusions

Do NOT:
- create generic documentation
- invent unsupported conventions
- introduce new architecture patterns
- rewrite project architecture
- generate onboarding/tutorial content
- create monolithic rule files
- duplicate rules across files
- generate conversational documentation

---

# Success Criteria

The implementation is successful when:
- generated rules match actual repository behavior
- Cursor retrieves correct scoped instructions
- AI-generated code follows existing conventions
- architecture violations decrease
- workflows become repeatable
- runtime/platform mistakes are prevented
- documentation remains concise and enforceable