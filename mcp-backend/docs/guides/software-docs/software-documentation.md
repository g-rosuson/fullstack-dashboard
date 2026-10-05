# Software Documentation

Think of software documentation as a stack where each layer answers a different question. Together, these documents ensure everyone—from stakeholders to developers and testers—works from the same source of truth.

## 1. Software Requirements Specification (SRS)
**Answers:** *What are we building?*

The SRS is the central requirements document. It defines the system's functional requirements (what it must do) and non-functional requirements (how well it must do it), without describing implementation details.

Requirements are written using clear, standardized language:

- **SHALL** → Mandatory requirement
- **SHOULD** → Strong recommendation
- **MAY** → Optional capability
- **SHALL NOT / MUST NOT** → Prohibited behavior

The goal is to make every requirement clear, measurable, and testable.

---

## 2. Agile Artifacts
**Answers:** *What work needs to be completed next?*

Agile artifacts break the SRS into manageable pieces of work. Docs: [`docs/tickets/`](../../tickets/).

- **User Stories** describe functionality from the user's perspective.
- **Definition of done** (acceptance for the work slice) defines when the ticket is complete.

These are planning and execution tools—not replacements for the SRS.

---

## 3. Architecture Documentation
**Answers:** *How will we build it?*

Once the requirements are defined, architecture documents explain the technical solution.

Common documents include:

- **ADR (Architecture Decision Record):** Records important technical decisions and why they were made.
- **C4 Model:** Visualizes the system at different levels, from the overall architecture down to individual components.
- **OpenAPI / AsyncAPI:** Defines precise API contracts that developers and systems integrate against.
- **HTTP acceptance:** Human-readable API scenarios traced to FRs (`HTTP-*`).
- **Client acceptance:** Human-readable UI scenarios traced to FRs (`CLIENT-*`).

Architecture documents describe implementation while remaining aligned with the requirements defined in the SRS.

---

## How They Work Together

```text
Business Goals
        │
        ▼
Software Requirements Specification (SRS)
        │
        ├── Functional Requirements (What the system does)
        ├── Non-Functional Requirements (How well it performs)
        │
        ▼
Agile Artifacts
(User Stories + Acceptance Criteria)
        │
        ▼
Architecture Documentation
(ADR + C4 + OpenAPI)
        │
        ▼
Development → Testing → Deployment
```

Each layer has a single responsibility:

- **SRS** defines the requirements.
- **Agile artifacts** organize and track implementation work.
- **Architecture documentation** explains the technical design.
- **Development and testing** verify that the implementation satisfies the original requirements.