# Material Transfer Simulation System (E4D Planner)
## Comprehensive User Manual & Operational Reference Guide
*Version 2.4 | Discrete Volumetric Simulation & Dynamic Haul Routing*

---

### Executive Overview
The **E4D Planner Material Transfer Simulator** is an engineering and logistics simulation environment designed to model bulk earthmoving, stockpile buffering, and haulage logistics across complex civil and mining projects. It combines an interactive cardinal routing canvas with a daily discrete simulation engine enforcing volume conservation, swell factors, and dynamic overflow throttleback constraints.

---

## 1. System Architecture & Node Topology

The simulation model is constructed from three fundamental node types connected by directed haulage routes:

- **Excavation Nodes (Sources)**: Represent active cut faces, pits, or quarry zones. Materials are excavated in in-situ bulk bank cubic meters (BCM) and transferred downline. Excavation containers deplete over the duration of the 30-day projection.
- **Stockpile Nodes (Buffers)**: Intermediate buffer storage facilities (e.g., Stockpile A, Stockpile B). Stockpiles have defined starting volumes and maximum capacities. Stockpiles handle both inbound receipts (compacted or loose) and outbound re-handling.
- **External Destination Nodes (Sinks)**: Final placement zones such as offsite processing mills, engineered fills, or commercial sale terminals. These nodes possess effectively unbounded capacity or large operational thresholds.

### Node Property Reference
Each container holds granular properties for bulk transformation, capacity, and status:
- `initial_volume`: Starting material volume (m³).
- `max_capacity`: Maximum permissible physical stockpile capacity (m³).
- `bulk_in`: Swell factor applied upon inbound receipt (e.g., 1.15x for gravel/clay).
- `bulk_out`: Factor applied upon outbound reclaiming.

*(Embedded in OpenOffice Document: Figure 1.1 — Stockpile Container Node Card)*

---

## 2. Graphical User Interface Overview

The workspace consists of five integrated control zones:

1. **Top Header Bar**: Houses primary global commands: CSV Import, Comprehensive CSV Export Modal, User Manual download, and the primary "Run Simulation & Play" toggle.
2. **Batch Preset Bar**: Located directly beneath the top header. Allows one-click application of standardized parameters (e.g. Swell 1.15x / 1.25x, capacity scaling) across multiple selected or all containers simultaneously.
3. **Central Canvas Viewport**: The primary spatial layout canvas. Supports smooth infinite panning, free zooming, container repositioning with magnetic snapping, and visual route authoring.
4. **Right Inspector Panel**: Contextual properties editor. When a container is selected, displays volumetric metrics, bulk in/out swell ratios, and active inbound/outbound links. When a route line is clicked, displays fleet haulage rates and truck assignments.
5. **Bottom Telemetry & Scrubber Tray**: Appears in Playback Mode. Provides a 30-day timeline scrubber with play, pause, and speed adjustments alongside an interactive multi-line trend graph.

*(Embedded in OpenOffice Document: Figure 2.1 — Top Global Control Bar)*
*(Placeholder in OpenOffice Document: Figure 2.2 — Overall Application Workspace)*

---

## 3. Container Management & Canvas Mechanics

Containers represent physical storage locations or active work faces. Users can manipulate containers freely on the canvas:

- **Creation**: Use the node addition toolbar to drop new Excavation, Stockpile, or External nodes onto the canvas.
- **Positioning & Dragging**: Click and hold anywhere on a container's header or body to translate it across the canvas coordinate plane. Transfer routes update their orthogonal geometry in real-time.
- **Container Halo Highlight**: Selected containers receive a wide, soft outer glow (halo) with an opacity factor of `0.52`. This halo does not replace or obscure the simulation engine status border, allowing users to assess node operational health (green, amber, red) while maintaining prominent selection feedback.
- **Multi-Selection**: Hold `Ctrl` (or `Cmd` on macOS) while clicking containers to select multiple nodes simultaneously for batch updates or comparative telemetry tracking.

---

## 4. Intelligent Proximity Snapping (12px Gap & 24px Threshold)

To ensure neat, human-engineered canvas layouts without tedious manual alignment, the application features an intelligent side-specific magnetic snapping engine:

- **Magnetic Proximity Range (24px)**: When dragging a container, if any of its edges come within 24 pixels of a neighboring container's boundary, the snapping engine activates.
- **Target Separation Margin (12px)**: Upon snapping, the dragged container smoothly latches to maintain an exact 12px aesthetic separation gap between adjacent edges.
- **Independent Axis & Side-Specific Constraint**: Snapping operates independently on each axis. Bringing a container vertically downward towards another snaps the top/bottom edges into a 12px gap without forcing the horizontal left/right edges to align, unless the horizontal edges are also independently within the 24px threshold. This eliminates unwanted jumps across unaffected coordinates.

*(Placeholder in OpenOffice Document: Figure 4.1 — Magnetic Snapping Alignment Guide)*

---

## 5. Transfer Link Routing, Corridor Separation & Rate Badges

Material transfer links define directed haulage corridors between nodes.

### 5.1 Manhattan Orthogonal Routing & 12px Corridor Separation
Routes automatically negotiate 90-degree orthogonal bends between container boundary ports. When multiple transfer links share a common spatial corridor (such as multiple haulage streams departing or entering the same stockpile), the engine automatically assigns each route a distinct parallel lane with a strict **12px corridor separation**. This guarantees routes never visually overlap or occlude one another.

### 5.2 Dynamic Flow Rate Badges
Every active transfer link renders a high-contrast pill badge displaying its planned or simulated transfer rate in standardized thousands-notation ('k' notation, e.g. `1.50k` for 1,500 m³/day).
Rate badges are algorithmically positioned along straight route segments and offset across distinct lanes so they never collide with container borders or neighboring link badges.

*(Embedded in OpenOffice Document: Figure 5.1 — Multi-link corridor routing)*
*(Embedded in OpenOffice Document: Figure 5.2 — Flow rate badges in 'k' notation)*

### 5.3 Operational Route Status Color Codes
| Status Indicator | Operational Definition & Engine Response |
| :--- | :--- |
| **GREEN (Full Flow)** | 100% of planned material volume is flowing without restriction. Upstream source has ample material, haul fleet is operating at peak capacity, and downstream receiver has adequate headroom. |
| **AMBER (Restricted)** | Flow is throttled (1% to 99% of planned rate). Occurs when a downstream stockpile is approaching maximum capacity and invokes the Throttleback rule, or when upstream source is nearing depletion. |
| **RED (Blocked / Halt)** | 0% flow. The downstream receiving stockpile is 100% full (overflow condition) or the upstream source is completely depleted. Haulage halts completely along this corridor. |
| **BLUE / SLATE (Idle)** | Inactive corridor or unsimulated route segment outside active scheduling window. |

---

## 6. Volumetric Simulation Engine & Overflow Rules

The mathematical simulation core evaluates material flow in discrete 24-hour cycles across a 30-day projection envelope. It rigorously computes bulk density and volume expansions:

### 6.1 Volumetric Swell Ratios
Material in-situ (bank cubic meters) expands upon excavation into loose cubic meters (LCM) by the `bulkInFactor` (typically 1.15x to 1.30x). When stockpiled material is reclaimed and compacted into engineered fills, the `bulkOutFactor` is applied. The simulation guarantees strict volumetric balance across all transfers.

### 6.2 Overflow Rule: Throttleback
When a downstream stockpile is projected to exceed its maximum capacity on Day $t$, the simulation engine engages **Upstream Throttleback**:
1. The engine calculates remaining headroom: `AvailableSpace = CapacityMax - CurrentVolume`.
2. Inflow is capped exactly to match AvailableSpace plus any outbound discharge occurring in the same step.
3. Inbound transfer link rates are curtailed proportionally, transitioning link indicators from green to amber.
4. Upstream excavation nodes retain un-excavated material in bank volume, preventing phantom loss.

### 6.3 Overflow Rule: Headroom Hold
If a buffer stockpile reaches critical capacity with zero outbound relief, the simulation locks the container into a **Headroom Hold** state. Inbound haulage routes turn red, and backpressure propagates up the supply chain, alerting site engineers to assign additional hauling assets or expand offsite disposal capacity.

---

## 7. Simulation Playback & Interactive Telemetry Graph

Clicking **Run Simulation & Play** executes the 30-day projection and transforms the interface into an interactive operational review deck:

### 7.1 Timeline Scrubber & Stepping
The bottom timeline controls allow engineers to step through Day 1 to Day 30 at variable playback speeds (1x, 2x, 5x, 10x). As the timeline advances:
- Every container card dynamically updates its real-time fill level and volumetric percentage bar.
- Route lines animate with moving dashed pulses matching simulated flow velocity.
- Route badges update their instantaneous daily throughput values.

### 7.2 Interactive Graphline Highlighting & Dual-Halo Visual System
To inspect specific critical paths amidst busy networks, the system implements a coordinated dual-halo highlight system:
- **Legend & Curve Selection**: Clicking any container in the canvas, or clicking its corresponding entry in the telemetry graph legend, activates focused tracking.
- **Graphline Halo (0.42 Opacity)**: The selected curve in the graph receives a soft, widened halo beneath the main line, instantly differentiating it from overlapping curves without losing color clarity.
- **Container Card Halo (0.52 Opacity)**: Simultaneously, the matching container on the canvas displays a wide luminous halo behind its border, allowing immediate spatial identification across large site layouts.
- **Ctrl + Click Multi-Highlight**: Hold `Ctrl` or `Cmd` to highlight two or more containers together, enabling direct visual comparison between interconnected excavations and buffer stockpiles.
- **Visibility Toggles**: Use the eye/checkbox icons in the legend to hide unselected series completely, isolating high-priority bottlenecks.

*(Embedded in OpenOffice Document: Figure 7.1 — Telemetry Graph panel)*

---

## 8. Preset Bar & Batch Configuration

Located below the primary navigation bar, the Batch Preset Bar accelerates scenario planning:
- **Swell Presets**: One-click toggling between Standard Gravel/Clay (1.15x swell), Blasted Rock (1.25x swell), and Saturated Wet Material (1.35x swell).
- **Capacity Buffers**: Quickly scale all stockpile capacities up or down by 10%, 25%, or 50% to test wet weather delays or construction phase shifts.
- **Haul Fleet Multipliers**: Instantly apply shift length adjustments (e.g., 10-hour single shift vs. 24-hour continuous haulage) to all active links.

---

## 9. CSV Data Model & Export Specifications

All simulation topologies and daily operational outputs are fully accessible through standard CSV import and export.

### 9.1 Model Structure CSV Specification
| CSV Column | Description & Expected Values |
| :--- | :--- |
| `record_type` | `NODE` for container definitions, `LINK` for transfer haulage routes. |
| `id, name, type` | Unique string identifier, display label, and entity type (`excavation`, `stockpile`, `external`). |
| `x, y` | Canvas pixel coordinates of container top-left corner. |
| `initial_volume, max_capacity` | Initial starting volume (m³) and maximum storage threshold (m³). |
| `bulk_in, bulk_out` | Volumetric expansion factors (e.g. 1.15, 1.00). |
| `source_id, target_id, planned_rate` | For LINK records: Origin node ID, destination node ID, and daily nominal haul capacity (m³/day). |

### 9.2 Simulation Daily Telemetry CSV Specification
Exported simulation audit logs provide complete 30-day discrete accounting:
- `day`: Integer projection day (1 to 30).
- `container_id, container_name`: Target facility identification.
- `start_volume, end_volume`: Beginning and ending day volumes (m³).
- `total_inflow, total_outflow`: Cumulative daily transfer volumes (m³).
- `utilization_pct`: Stockpile volume as a percentage of maximum capacity.
- `operational_status`: Operational status code (`FULL_FLOW`, `RESTRICTED`, `OVERFLOW_HOLD`, `DEPLETED`).

*(Placeholder in OpenOffice Document: Figure 9.1 — CSV Export Configuration Modal)*

---

## 10. Quick Reference & Operational Shortcuts

| Keyboard / Mouse Action | Operation & Result |
| :--- | :--- |
| **Left Click Container** | Select single container; open node inspector; trigger luminous 0.52 halo. |
| **Ctrl + Click (or Cmd + Click)** | Multi-select containers or multi-highlight telemetry graph curves. |
| **Drag Container** | Reposition on canvas with automatic 12px gap magnetic edge snapping (within 24px range). |
| **Middle Click / Space + Drag** | Pan canvas viewport across infinite layout space. |
| **Mouse Wheel** | Zoom canvas in and out centered on cursor. |
| **Click Route Line / Badge** | Open route inspector to configure daily haul capacity and truck fleet allocation. |
| **Spacebar (Playback Mode)** | Toggle simulation playback between Play and Pause. |

---

*OpenOffice User Manual Document generated and saved at `/Material_Transfer_Simulation_User_Manual.odt`.*
