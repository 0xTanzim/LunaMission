# LunaMission — Technical Documentation Index

Welcome to the LunaMission technical documentation suite for the **NASA Space Apps Challenge 2026** ([Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)).

This directory contains the authoritative system requirements, architectural specifications, astrodynamical formulations, and validation protocols governing the platform.

---

## 🏛️ System Documentation

| Document | Purpose & Scope |
| :--- | :--- |
| [**USER_GUIDE.md**](USER_GUIDE.md) | **Flight Deck Operations & User Guide**: Operational workflows, 5 workspace guides, rover controls, keyboard shortcuts, and scientific status flag guide. |
| [**PRD.md**](PRD.md) | **Product Requirements Document**: Mission objectives, user personas, functional requirements, and operational workflows for lunar south pole exploration. |
| [**ARD.md**](ARD.md) | **Architecture Requirements Document**: System topology, decoupled spatial-temporal compute model, backend/frontend boundary invariants, and content-addressable caching. |
| [**SCIENCE_FEASIBILITY.md**](SCIENCE_FEASIBILITY.md) | **Mathematical & Physical Formulations**: Spherical lunar curvature geometry, LOLA horizon ray-marching ($s_{\text{bound}}$), topocentric ephemeris transforms (`MOON_ME`), and the Rolle's Theorem event-splitting visibility solver. |
| [**DATA_TAXONOMY.md**](DATA_TAXONOMY.md) | **Lunar Data Taxonomy & Site Registry**: Provenance standards, PDS LOLA altimetry rasters, LROC imagery, and the 5-layer landing site catalog (`data/sites-registry.json`). |
| [**VALIDATION_PROTOCOL.md**](VALIDATION_PROTOCOL.md) | **Scientific Validation Protocol**: Three-stage test gates (Stage 1: Spatial & DEM verification; Stage 2: Temporal & ephemeris solver proofs; Stage 3: External literature benchmarks against Mazarico et al. and Wueller et al.). |
| [**API_CONTRACT.md**](API_CONTRACT.md) | **REST API & Integration Specification**: OpenAPI/RFC 7807 endpoint contracts, request/response schemas, error models, and integration interfaces. |

---

## 🔬 Scientific & Research Reference

For the scientific feasibility analysis and validation gates behind the project, refer to [`SCIENCE_FEASIBILITY.md`](SCIENCE_FEASIBILITY.md) and [`VALIDATION_PROTOCOL.md`](VALIDATION_PROTOCOL.md).
