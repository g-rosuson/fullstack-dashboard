# Client — Sidebar

Surface: navigation listing chrome

## CLIENT-UI-NAV-001 — Destinations are named

- Setup: a navigation listing with labelled destinations
- Action: observe the destinations
- Assert: each destination exposes that label as its name

Traces:
- [FR-UI-NAV-001](../../../requirements/fr/ui/nav.md)
- [FR-UI-ACT-001](../../../requirements/fr/ui/action.md)
- [NFR-A11Y-UI-001](../../../requirements/nfr/accessibility/ui.md)

## CLIENT-UI-NAV-002 — Current destination

- Setup: a navigation listing; the user is on one of those destinations
- Action: observe the listing
- Assert: that destination is indicated as current; the others are not

Traces:
- [FR-UI-NAV-002](../../../requirements/fr/ui/nav.md)
- [NFR-A11Y-UI-001](../../../requirements/nfr/accessibility/ui.md)

## CLIENT-UI-NAV-003 — Activate destination

- Setup: a navigation listing with labelled destinations
- Action: activate a destination that is not current
- Assert: the user is taken to that destination

Traces:
- [FR-UI-NAV-003](../../../requirements/fr/ui/nav.md)
- [NFR-A11Y-UI-002](../../../requirements/nfr/accessibility/ui.md)

## CLIENT-UI-NAV-004 — Optional destination icon

- Setup: a navigation listing; one destination provides an icon and another does not
- Action: observe the destinations
- Assert: the destination with an icon shows it; the destination without an icon does not

Traces:
- [FR-UI-NAV-004](../../../requirements/fr/ui/nav.md)
