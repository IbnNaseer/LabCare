# LabCare 🔬
> **Web-Based Laboratory Equipment Fault Reporting and Maintenance Prediction System**  
> *Undergraduate Degree Thesis Project &bull; Federal University Dutse (FCP/CSC/22/1059)*

---

## 📖 Overview
**LabCare** is a web platform designed to streamline laboratory asset management across academic institutions. It bridges the gap between students, laboratory technologists, maintenance engineers, and administrators by combining:
- **Instant QR Code Tagging & Scanning** for rapid asset fault reporting.
- **4-Step Guided Fault Workflow** with image upload evidence and priority categorization.
- **Predictive Maintenance Engine (Equipment Health Index — EHI)** calculating continuous health scores based on usage, fault history, and service intervals.
- **Role-Based Access Control (RBAC)** providing customized dashboards for Students, Technologists, Engineers, and Administrators.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Tokens), Vanilla JavaScript (ES6+), Bootstrap Icons |
| **Charts & Scanner** | Chart.js, `html5-qrcode` |
| **Backend Runtime** | Node.js (v18+) & Express.js |
| **Database & ORM** | MySQL 8.x (InnoDB engine) with Sequelize ORM |
| **Authentication** | JWT (JSON Web Tokens) with `bcrypt` (12 rounds) |
| **File Handling** | `multer` with 5MB validation & MIME filtering |
| **Automated Jobs** | `node-cron` for nightly operational hours accrual |
| **Testing** | Jest unit tests + REST integration suite |

---

## 📁 Project Structure

```
LabCare/
├── client/                     # Frontend Application
│   ├── css/                    # Custom stylesheets (variables, main layout, auth)
│   ├── js/                     # Client logic (API client, auth guard, sidebar, charts)
│   ├── views/                  # HTML Views (login, dashboard, scan-qr, report-fault, equipment, predictions, maintenance)
│   └── public/qrcodes/         # Auto-generated high-res printable QR code tags
│
├── server/                     # Backend API & Server
│   ├── src/
│   │   ├── config/             # Database & environment configurations
│   │   ├── models/             # Sequelize models (User, Equipment, Schedule, FaultReport, MaintenanceLog, Prediction)
│   │   ├── controllers/        # Business logic & endpoints
│   │   ├── routes/             # Express API routing (/api/v1)
│   │   ├── middleware/         # Auth, RBAC, Multer upload, and Error handling
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
Edit `.env` to provide your MySQL database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lab_fault_system
DB_USER=root
DB_PASSWORD=your_password
```

### 4. Seed Demo Data & Assets
```bash
# In the server/ directory:
npm run seed
```

### 5. Start the Application
```bash
# Start backend API (with frontend static serving):
npm run dev
```

Visit the app in your browser:  
👉 **`http://localhost:3000`**

---

## 👥 Demo User Accounts (Password: `password123`)

| Role | Email Address | Access Level |
|---|---|---|
| 👑 **Admin** | `admin@fud.edu.ng` | Full control: Add equipment, auto-generate QR tags, recalculate EHI, manage system |
| 🔬 **Technologist** | `tech@fud.edu.ng` | Manage fault tickets, assign repair tasks, update status pipeline |
| ⚙️ **Engineer** | `engineer@fud.edu.ng` | Maintenance diagnostics, repair action logs, cost tracking, predictive triage |
| 🎓 **Student** | `student@fud.edu.ng` | QR camera scanner, 4-step fault reporting wizard, view own reports |

---

## 🧪 Running Tests

```bash
# Run complete test suite (Unit + API Integration):
node tests/runner.js
```

---

## 📜 License
Developed for academic research and evaluation at Federal University Dutse.
