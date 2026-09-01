# LabCare 🔬
> **Web-Based Laboratory Equipment Fault Reporting, Maintenance Tracking, and Predictive Health System**  
> *Undergraduate Degree Thesis Project &bull; Federal University Dutse (FCP/CSC/22/1059)*

---

## 📖 Overview
**LabCare** is an enterprise-grade laboratory asset and maintenance management platform engineered for academic and research institutions. It connects students, laboratory technologists, maintenance engineers, and faculty administrators into a unified real-time workflow:

- 🏷️ **Dynamic QR Code Tagging & Printing**: Auto-generates clean, printable asset tags (Name, Serial Number, QR Code) for lab devices.
- 📱 **Camera & File QR Scanner**: Instant equipment lookup by physical camera scan, image upload, or asset tag search.
- 🚩 **4-Step Guided Fault Reporting**: Student reporting pipeline with photo evidence attachments and active duplicate ticket prevention (HTTP 409 Conflict).
- 🧮 **Predictive Maintenance Engine (Equipment Health Index — EHI)**: Continuous $0-100\%$ health scoring combining operational hours, failure frequency, and service intervals.
- 📅 **Weekly Lab Timetable & Usage Accrual**: Maps course practical sessions to machines with one-click weekly class hour accrual.
- 📊 **Executive & Student Dashboards**: Real-time KPI counters, rolling 7-day fault trends, live status steppers, and risk distribution donuts.
- 📄 **Institutional Audit Reports & CSV Export**: Print-ready A4 audit documents and instant CSV export for laboratory accounting.
- 📦 **Decommissioned Asset Archival**: Cleanly archives scrapped equipment while preserving historical audit trails.

---

## 🧮 Equipment Health Index (EHI) Mathematical Model

LabCare computes an **Equipment Health Index (EHI)** score from **$0\%$ to $100\%$** for every laboratory asset using a weighted multi-factor formula:

$$\text{EHI} = 100 - \Big(\text{Usage Penalty} + \text{Failure Penalty} + \text{Service Penalty}\Big)$$

| Factor | Weight | Formulation | Purpose |
| :--- | :---: | :--- | :--- |
| **1. Operational Usage** | **40%** | $\min\left(40, \frac{\text{Operational Hours}}{\text{Expected Lifespan Hours}} \times 40\right)$ | Measures asset wear relative to rated lifespan |
| **2. Failure History** | **30%** | $\min\left(30, \frac{\text{Resolved Fault Count}}{10} \times 30\right)$ | Penalizes machines with recurring breakdowns |
| **3. Service Interval** | **30%** | $\min\left(30, \frac{\text{Days Since Last Service}}{180\text{ days}} \times 30\right)$ | Enforces routine 6-month certified servicing |

### 🚦 Health Risk Triage & Automated Actions:
- 🟢 **Low Risk ($\ge 70\%$)**: Prime operational health.
- 🟡 **Medium Risk ($40\% - 69.9\%$)**: Degradation detected; flagged for scheduled routine servicing.
- 🔴 **High Risk ($< 40\%$)**: Critical failure risk; triggers automated email dispatch to laboratory engineers for preventative intervention.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Modern CSS Tokens, Vanilla JavaScript (ES6+), Bootstrap Icons |
| **Data Visualization** | Chart.js (Line charts, Health distribution donuts) |
| **QR Engine** | `html5-qrcode`, `jsQR`, `qrcode` generator |
| **Backend API** | Node.js (v18+) & Express.js RESTful architecture |
| **Database & ORM** | MySQL 8.x (InnoDB engine) with Sequelize ORM |
| **Security & Auth** | JWT (JSON Web Tokens) with `bcrypt` password hashing (12 rounds) & RBAC middleware |
| **File Storage** | `multer` multipart handling with MIME validation & 5MB file caps |
| **Testing** | Automated Jest unit tests + REST integration suite |

---

## 📁 Project Structure

```
LabCare/
├── client/                     # Frontend Application
│   ├── css/                    # Custom stylesheets (variables, main layout, auth)
│   ├── js/                     # Client modules (api, auth, sidebar, export, audit-report, dashboard, etc.)
│   ├── views/                  # HTML Views (login, dashboard, scan-qr, report-fault, equipment, equipment-detail, predictions, maintenance, audit-report)
│   └── public/qrcodes/         # Auto-generated high-res printable QR code tags
│
├── server/                     # Backend API & Server
│   ├── src/
│   │   ├── config/             # Database & environment configurations
│   │   ├── models/             # Sequelize models (User, Equipment, ClassSchedule, FaultReport, MaintenanceLog, Prediction)
│   │   ├── controllers/        # Business logic controllers
│   │   ├── routes/             # Express API routing (/api/v1)
│   │   ├── middleware/         # Auth guard, RBAC, Multer upload, and Error handling
│   │   └── services/           # EHI calculation, email alerts, QR generation
│   ├── seeders/                # Database seeders for realistic demo data
│   └── .env.example            # Environment configuration template
│
├── tests/                      # Centralized Test Suite
│   ├── TEST_RECORD.md          # Formal Waterfall SDLC verification matrix
│   ├── runner.js               # Automated test execution engine
│   ├── unit/                   # EHI mathematical boundary & floor tests
│   ├── integration/            # REST API & RBAC endpoint tests
│   └── results/                # Execution logs & evidence
│
└── docs/                       # Project Specifications & Developer Guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [MySQL Server](https://dev.mysql.com/downloads/) (or XAMPP / WampServer)

### 2. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE lab_fault_system;
```

### 3. Server Configuration
```bash
cd server
npm install
cp .env.example .env
```
Configure `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lab_fault_system
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

### 4. Seed Demo Data & Assets
```bash
# In the server/ directory:
npm run seed
```

### 5. Start the Application
```bash
# Start backend API (serves both API and frontend statically):
npm run dev
```

Visit the application in your browser:  
👉 **`http://localhost:3000`**

---

## 👥 Demo User Accounts (Default Password: `password123`)

| Role | Email Address | Core Capabilities |
|---|---|---|
| 👑 **Admin** | `admin@fud.edu.ng` | Full system control: Add equipment, manage users, timetable schedules, audit reports |
| 🔬 **Technologist** | `tech@fud.edu.ng` | Manage fault tickets, assign repair tasks, update operational hours, timetable accrual |
| ⚙️ **Engineer** | `engineer@fud.edu.ng` | Maintenance diagnostics, repair action logs, spare parts cost tracking, predictive triage |
| 🎓 **Student** | `student@fud.edu.ng` | QR camera scanner, 4-step fault reporting wizard, live status tracker |

---

## 🧪 Running Automated Tests

```bash
# Run complete test suite (Unit + API Integration):
node tests/runner.js
```

---

## 📜 License
Developed for academic research and evaluation at Federal University Dutse.
