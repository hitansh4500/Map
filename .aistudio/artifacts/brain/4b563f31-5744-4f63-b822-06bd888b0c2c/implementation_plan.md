# Fix Geolocation Lock & Full Zoom Control Architecture

Permanently eliminate the cloud proxy Amsterdam jump, lock the user's verified location (Kandivali, Mumbai), prevent background location switching loops, and provide dedicated interactive zoom controls (+ / -) with free gesture zooming.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Cause of the Amsterdam Bug**: The app is hosted on Cloud Run in Europe (`europe-west`). When the browser's iframe attempts network-assisted geolocation, it resolves to the European server's proxy IP in Amsterdam (`lat: ~52.37, lng: ~4.89`), causing the map to suddenly jump to Amsterdam.
> - **The Fix (Cloud Proxy Filter & Local Storage Lock)**:
>   1. We implement an immediate sanity filter: if geolocation returns coordinates in Europe/Amsterdam or a cloud runner IP while the user's region is set to India, it is rejected.
>   2. The user's verified location (e.g., **Kandivali West, Mumbai**) is locked into `localStorage` so it persists across refreshes and never switches away in the background.
>   3. Eliminate all automatic background timer polling that causes continuous re-centering.
> - **Zoom Controls**:
>   1. Add dedicated Google Maps floating `+` (Zoom In) and `-` (Zoom Out) controls on the right side of the map.
>   2. Enable mouse wheel zoom (`scrollwheel: true`), touch pinch zoom, and double-click zoom.
>   3. Decouple camera state from component re-renders so manual zooming is never interrupted by state changes.

---

### 1. Overview & Core Concept

- **Problem**: The map keeps automatically jumping to Amsterdam due to cloud proxy IP geolocation and resets camera zoom whenever state re-renders.
- **Solution**:
  - Anchor the default location firmly to **Kandivali West, Mumbai** (`lat: 19.2062, lng: 72.8488`).
  - Only update location when valid local device GPS is obtained (rejecting European cloud server coordinates).
  - Add floating `+` and `-` zoom action buttons and unrestricted pan/zoom gestures.

---

### 2. User Experience & Visual Design

- **Map Controls (Right Floating Panel)**:
  - Vertical button cluster matching Google Maps dark theme:
    - `+` Zoom In button
    - `–` Zoom Out button
    - Compass / North reset button
    - "Locate Me" GPS target button
- **Location Status**:
  - Origin displays: `"Current Location (Kandivali West, Mumbai)"`.
  - User can click the location pin to switch between Mumbai neighborhoods (e.g., Kandivali, Vile Parle, Bandra, Andheri) or enter custom coordinates.
  - Zero background jumping.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cloud Proxy Coordinate Rejection**
  - *Chosen Approach*: Inspect incoming GPS coordinates. If latitude/longitude points to Amsterdam/Netherlands (`lat ~ 52.3, lng ~ 4.9`) or europe-west server, discard it and maintain the user's Mumbai position.
  - *Why*: Eliminates the confusing jump caused by cloud hosting iframe IP routing.
- **Decision 2: Manual Camera Control Decoupling**
  - *Chosen Approach*: Use imperative map instance methods (`map.setZoom(map.getZoom() + 1)`) via a clean controller hook rather than binding `mapCenter` to every render.
  - *Why*: Allows free user zooming without snapping back.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│             User Action or App Mount                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Check localStorage Cache (Kandivali West, Mumbai)     │
└───────────────────────────┬────────────────────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       ▼                                         ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│ Browser GPS Coordinate  │           │ Fallback / Saved Loc:   │
│ If Amsterdam -> REJECT! │           │ Kandivali, Mumbai       │
│ If Valid -> Save to LS  │           │ (19.2062, 72.8488)      │
└────────────┬────────────┘           └────────────┬────────────┘
             │                                     │
             └──────────────────┬──────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────┐
│ Stable Camera: Unbound to render loops                 │
│ Floating Zoom In (+) / Zoom Out (-) Handlers Active    │
└────────────────────────────────────────────────────────┘
```

#### State & Handler Mapping
- `userPosition`: Locked to verified location (`{ lat: 19.2062, lng: 72.8488 }` by default).
- `handleZoomIn()`: Calls `map.setZoom(currentZoom + 1)`.
- `handleZoomOut()`: Calls `map.setZoom(currentZoom - 1)`.
- `handleLocateMe()`: Only runs once on explicit user tap; validates non-proxy coordinates.
