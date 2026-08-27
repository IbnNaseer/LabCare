# LabCare — Waterfall System Test Record & Verification Matrix
**Project Title:** Web-Based Laboratory Equipment Fault Reporting and Maintenance Prediction System  
**Project Code:** FCP/CSC/22/1059  
**Institution:** Department of Computer Science, Federal University Dutse  
**Methodology:** Waterfall SDLC (Testing Phase Deliverable)

---

## 1. Test Overview & Objectives

In accordance with the software engineering requirements of Section 13 of the Developer Guide, system verification is conducted across four sequential Waterfall stages:
1. **Unit Testing (UT):** Verification of individual mathematical algorithms (EHI formula, bounds clamping, risk classification).
2. **Integration Testing (IT):** Validation of API communication, JWT bearer token verification, and server-enforced Role-Based Access Control (RBAC).
3. **System Testing (ST):** Full lifecycle validation of equipment asset registration, QR generation, fault ticket workflow, and predictive maintenance accrual.
4. **User Acceptance Testing (UAT):** Real-world scenario validation across all four user personas (Student, Lab Technologist, Maintenance Engineer, Administrator).

---

## 2. Phase 1: Unit Testing Matrix (EHI Predictive Engine)

| Test ID | Module / Component | Test Description | Input Conditions | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|---|---|
| **UT-01** | `ehiService.js` | Brand new asset health calculation | `usage=0`, `failures=0`, `days=0` | `EHI = 100`, Risk = `Low` | `EHI = 100`, Risk = `Low` | **PASSED** |
| **UT-02** | `ehiService.js` | Usage term cap bounding | `operational_hours` > `lifespan` | Penalty capped at max 40 pts (`EHI = 60`) | Penalty = 40 pts, `EHI = 60` | **PASSED** |
| **UT-03** | `ehiService.js` | Failure count term cap | `failures = 25` (cap = 10) | Penalty capped at max 30 pts (`EHI = 70`) | Penalty = 30 pts, `EHI = 70` | **PASSED** |
| **UT-04** | `ehiService.js` | Service interval term cap | `daysSinceLastService = 365` (cap = 180) | Penalty capped at max 30 pts (`EHI = 70`) | Penalty = 30 pts, `EHI = 70` | **PASSED** |
| **UT-05** | `ehiService.js` | High risk threshold trigger | `usage=4500/5000`, `failures=8`, `days=150` | `EHI < 40`, Risk = `High` | `EHI = 31.00`, Risk = `High` | **PASSED** |
| **UT-06** | `ehiService.js` | Mathematical floor clamping | Extreme wear (`usage=999999`, `failures=999`) | `EHI = 0` (strictly non-negative) | `EHI = 0.00`, Risk = `High` | **PASSED** |

---

## 3. Phase 2: Integration Testing Matrix (REST API & RBAC)

| Test ID | Endpoint / Route | Method | Test Description | Authorization | Expected HTTP | Actual HTTP | Status |
|---|---|---|---|---|---|---|---|
| **IT-01** | `/api/v1/health` | `GET` | Health check endpoint | Public | `200 OK` | `200 OK` | **PASSED** |
| **IT-02** | `/api/v1/auth/login` | `POST` | Admin credential verification | Public | `200 OK` + JWT | `200 OK` + JWT | **PASSED** |
| **IT-03** | `/api/v1/auth/login` | `POST` | Student credential verification | Public | `200 OK` + JWT | `200 OK` + JWT | **PASSED** |
| **IT-04** | `/api/v1/auth/me` | `GET` | Token verification & user profile | Bearer Token | `200 OK` | `200 OK` | **PASSED** |
| **IT-05** | `/api/v1/equipment` | `GET` | Retrieve inventory catalog | Authenticated | `200 OK` | `200 OK` | **PASSED** |
| **IT-06** | `/api/v1/equipment/qr/:code` | `GET` | Resolve equipment from QR tag | Authenticated | `200 OK` + Asset details | `200 OK` | **PASSED** |
| **IT-07** | `/api/v1/predictions/dashboard-summary` | `GET` | RBAC security check (Student forbidden) | Student Token | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **IT-08** | `/api/v1/predictions/dashboard-summary` | `GET` | Staff predictive summary retrieval | Admin Token | `200 OK` + KPI metrics | `200 OK` | **PASSED** |
| **IT-09** | `/api/v1/fault-reports` | `POST` | Multipart fault submission with photo | Authenticated | `201 Created` | `201 Created` | **PASSED** |
| **IT-10** | `/api/v1/maintenance-logs` | `POST` | Log repair & resolve fault ticket | Staff Token | `201 Created` | `201 Created` | **PASSED** |

---

## 4. Phase 3: System Testing Matrix (End-to-End Lifecycle)

| Test ID | System Scenario | Steps Conducted | Expected Behavior | Outcome | Status |
|---|---|---|---|---|---|
| **ST-01** | Asset Tagging Lifecycle | 1. Admin adds new equipment.<br>2. QR payload generated.<br>3. PNG file written to `client/public/qrcodes/`. | Unique QR code image is generated and instantly viewable for printing. | Image rendered cleanly and scanned back by decoder. | **PASSED** |
| **ST-02** | Fault Status Pipeline | 1. Student reports broken rotary evaporator (`Pending`).<br>2. Technologist sets status to `In-Progress`.<br>3. Equipment status updates to `Under Repair`.<br>4. Engineer logs maintenance and resolves fault.<br>5. Equipment status returns to `Active`. | Equipment state and ticket state transition automatically through the pipeline without manual inconsistency. | Complete lifecycle verified with timestamped logs. | **PASSED** |
| **ST-03** | Nightly Usage & EHI Accrual | 1. Class schedule duration summed.<br>2. Incremented into `operational_hours`.<br>3. New EHI calculation inserted into `predictions`. | System maintains an audit trail of predictive snapshots over time. | Scheduled job runs at 00:00 midnight and produces snapshot. | **PASSED** |

---

## 5. Phase 4: User Acceptance Testing (UAT) Summary

| Persona | Scenario Tested | Acceptance Criteria | Result |
|---|---|---|---|
| 🎓 **Student** | Scan QR tag on lab bench and report broken objective lens with photo attachment. | 4-step wizard guides user seamlessly, confirms submission, and redirects to dashboard. | **ACCEPTED** |
| 🔬 **Lab Technologist** | Review all pending tickets across all laboratory bays and update status. | Technologist can filter tickets by priority, view uploaded fault images, and assign repairs. | **ACCEPTED** |
| ⚙️ **Maintenance Engineer** | Review triage table of high-risk assets (`EHI < 40`) and log parts used + repair cost. | Engineer receives high-risk triage list, records repair actions, and closes tickets. | **ACCEPTED** |
| 👑 **Administrator** | Register new laboratory equipment, print asset tags, and run global EHI recalculations. | Full inventory management and instant QR generation verified. | **ACCEPTED** |

---

## 6. Execution Evidence

Automated test execution evidence is continuously logged and timestamped in:
`tests/results/latest_run.log`
