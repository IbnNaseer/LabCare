# Developer Guide
## Web-Based Laboratory Equipment Fault Reporting and Maintenance Prediction System

**Project:** FCP/CSC/22/1059 — Federal University Dutse
**Stack:** Node.js, Express.js, MySQL, Sequelize ORM, HTML5/CSS3/JS, Bootstrap 5

This guide contains everything needed to build the system exactly as specified in the project proposal: architecture, database schema, API contracts, business logic, security rules, and testing strategy. Follow it in order — each section builds on the last.

---

## 1. System Overview

**Problem solved:** paper-based fault logbooks cause delayed repairs and no predictive visibility into equipment health.

**Solution:** a web platform where any authenticated user can report a fault (via QR scan or manual selection), staff manage repair workflows through a status pipeline, and a predictive engine (Equipment Health Index) flags at-risk equipment before it fails.

**Four roles:** Student, Lab Technologist, Maintenance Engineer, Admin.

**Core principle for every feature you build:** if it doesn't map to fault reporting, ticket management, equipment inventory, or predictive health scoring, it's out of scope — do not add features not traceable to the objectives.

---

## 2. Tech Stack & Versions

| Layer | Technology | Notes |
|---|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6), Bootstrap 5 | Server-rendered views or fetch-based SPA-lite; no framework required |
| QR Scanning | `html5-qrcode` (npm/CDN) | Browser camera access — test on real devices early (Month 2) |
| QR Generation | `qrcode` (npm) | Server-side, for printable asset tags |
| Backend Runtime | Node.js 18 LTS or later | |
| Backend Framework | Express.js 4.x | |
| Database | MySQL 8.x, InnoDB engine | Required for foreign key enforcement |
| ORM | Sequelize 6.x | Model-level validation + FK enforcement |
| Auth | `bcrypt` (hashing), `jsonwebtoken` or `express-session` | Pick one session strategy — see §6 |
| File Uploads | `multer` | Fault report images |
| Email | `nodemailer` | High-Risk alerts |
| Dev Tools | VS Code, Git, npm, Postman | |
| Testing | Jest or Mocha + Chai, Supertest (API), Postman (manual/collection) | |

Install baseline:
```bash
npm init -y
npm install express sequelize mysql2 bcrypt jsonwebtoken multer nodemailer qrcode dotenv cors
npm install --save-dev nodemon jest supertest
```

---

## 3. Project Folder Structure (MVC)

Do not put all logic in one file. The project is split into **two top-level directories** — `server/` (backend API) and `client/` (frontend UI) — each with its own `package.json`. This separation keeps concerns clean and is what a viva panel will expect to see:

```
LabCare/
├── server/                        # Backend API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js        # Sequelize connection config
│   │   │   └── env.js             # loads/validates .env variables
│   │   ├── models/
│   │   │   ├── index.js           # Sequelize init + associations
│   │   │   ├── User.js
│   │   │   ├── Equipment.js
│   │   │   ├── FaultReport.js
│   │   │   ├── MaintenanceLog.js
│   │   │   ├── Prediction.js
│   │   │   └── ClassSchedule.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── equipmentController.js
│   │   │   ├── faultReportController.js
│   │   │   ├── maintenanceController.js
│   │   │   └── predictionController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── equipmentRoutes.js
│   │   │   ├── faultReportRoutes.js
│   │   │   ├── maintenanceRoutes.js
│   │   │   └── predictionRoutes.js
│   │   ├── middleware/
│   │   │   ├── authenticate.js    # verifies JWT/session
│   │   │   ├── authorize.js       # role-based permission checks
│   │   │   ├── uploadImage.js     # multer config + validation
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── ehiService.js      # EHI calculation logic
│   │   │   ├── alertService.js    # nodemailer + in-app notifications
│   │   │   └── qrService.js       # QR generation
│   │   ├── app.js                 # Express app setup
│   │   └── server.js              # entry point
│   ├── migrations/                # Sequelize migrations (one per table)
│   ├── seeders/                   # demo/synthetic data only, clearly labeled
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── uploads/
│   │   └── fault-reports/         # uploaded fault images (outside public web root)
│   ├── .env.example
│   └── package.json               # backend dependencies
│
├── client/                        # Frontend UI
│   ├── css/                       # stylesheets
│   ├── js/                        # client-side JavaScript
│   ├── views/                     # HTML pages
│   ├── public/
│   │   └── qrcodes/               # generated QR code images
│   └── package.json               # frontend dependencies (if any)
│
├── docs/                          # project documentation
│   ├── DEVELOPER_GUIDE.md
│   └── UI_UX_SPEC.md
└── .gitignore
```

**Rule:** controllers never contain raw SQL. All data access goes through Sequelize models. This is the SQL-injection safeguard committed to in the proposal.

---

## 4. Database Schema

Use Sequelize **migrations**, not `sync({ force: true })`, so schema changes are tracked — this matters for your documentation deliverable (Section 7).

### 4.1 Full Schema (SQL reference)

```sql
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Student','Technologist','Engineer','Admin') NOT NULL DEFAULT 'Student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE equipment (
  equipment_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  qr_code VARCHAR(255) UNIQUE,
  location VARCHAR(150),
  purchase_date DATE,
  expected_lifespan_hours INT NOT NULL,
  operational_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('Active','Under Repair','Scrapped') DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE class_schedule (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  lab_name VARCHAR(150),
  session_day ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun'),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE fault_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  reported_by INT NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
  image_path VARCHAR(255) DEFAULT NULL,
  status ENUM('Pending','In-Progress','Resolved','Scrapped') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
  FOREIGN KEY (reported_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE maintenance_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  technician_id INT NOT NULL,
  fault_report_id INT DEFAULT NULL,
  action_taken TEXT,
  parts_used VARCHAR(255),
  service_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  cost DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
  FOREIGN KEY (technician_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (fault_report_id) REFERENCES fault_reports(report_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE predictions (
  prediction_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  ehi_score DECIMAL(5,2) NOT NULL,
  risk_level ENUM('Low','Medium','High') NOT NULL,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  alert_sent BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### 4.2 Relationship Summary

| Table | Relationships |
|---|---|
| `users` | 1 → many `fault_reports` (reporter); 1 → many `maintenance_logs` (technician) |
| `equipment` | 1 → many `fault_reports`, `maintenance_logs`, `predictions`, `class_schedule` |
| `fault_reports` | many → 1 `equipment`; many → 1 `users` |
| `maintenance_logs` | many → 1 `equipment`; many → 1 `users`; many → 1 `fault_reports` (nullable) |
| `predictions` | many → 1 `equipment` (historical snapshots) |
| `class_schedule` | many → 1 `equipment` (feeds EHI operational-hours estimation) |

---

## 5. Sequelize Models

Example — `models/FaultReport.js` (repeat this pattern for every table):

```js
module.exports = (sequelize, DataTypes) => {
  const FaultReport = sequelize.define('FaultReport', {
    report_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    priority: { type: DataTypes.ENUM('Low','Medium','High','Critical'), defaultValue: 'Medium' },
    image_path: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('Pending','In-Progress','Resolved','Scrapped'), defaultValue: 'Pending' },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'fault_reports', timestamps: true, createdAt: 'created_at', updatedAt: false });

  FaultReport.associate = (models) => {
    FaultReport.belongsTo(models.Equipment, { foreignKey: 'equipment_id', onDelete: 'RESTRICT' });
    FaultReport.belongsTo(models.User, { foreignKey: 'reported_by', onDelete: 'RESTRICT' });
    FaultReport.hasMany(models.MaintenanceLog, { foreignKey: 'fault_report_id' });
  };

  return FaultReport;
};
```

`models/index.js` wires all models together:

```js
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const db = {};

fs.readdirSync(__dirname)
  .filter(f => f !== 'index.js')
  .forEach(f => {
    const model = require(path.join(__dirname, f))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach(model => { if (model.associate) model.associate(db); });

db.sequelize = sequelize;
module.exports = db;
```

---

## 6. Authentication & Role-Based Access Control

**Session strategy:** use JWT (stateless, simpler for a solo dev to reason about and test with Postman). Store the token client-side; send as `Authorization: Bearer <token>`.

`middleware/authenticate.js`:
```js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { user_id, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

`middleware/authorize.js` — enforce the permission matrix from the proposal:
```js
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

### Permission Matrix (enforce server-side, not just hidden in UI)

| Action | Student | Technologist | Engineer | Admin |
|---|---|---|---|---|
| Create fault report | ✅ | ✅ | ✅ | ✅ |
| View own reports | ✅ | ✅ | ✅ | ✅ |
| View all reports | ❌ | ✅ | ✅ | ✅ |
| Update report status | ❌ | ✅ | ✅ | ✅ |
| Create maintenance log | ❌ | ✅ | ✅ | ✅ |
| Manage equipment inventory | ❌ | ❌ | ❌ | ✅ |
| View predictive dashboard | ❌ | ✅ | ✅ | ✅ |

Route usage example:
```js
router.patch('/fault-reports/:id/status',
  authenticate,
  authorize('Technologist', 'Engineer', 'Admin'),
  faultReportController.updateStatus
);
```

Passwords: always `bcrypt.hash(password, 12)` on registration, `bcrypt.compare()` on login — never store or log plaintext.

---

## 7. API Endpoint Reference

Base path: `/api/v1`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Creates user (role defaults to Student unless Admin-created) |
| POST | `/auth/login` | Public | Returns JWT |

### Equipment
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/equipment` | Any authenticated | List/search inventory |
| GET | `/equipment/:id` | Any authenticated | Single equipment detail + current EHI |
| GET | `/equipment/qr/:qrCode` | Any authenticated | Resolve equipment by scanned QR value |
| POST | `/equipment` | Admin | Add new equipment; auto-generates QR |
| PUT | `/equipment/:id` | Admin | Update equipment record |

### Fault Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/fault-reports` | Any authenticated | Create report (multipart: description, priority, image) |
| GET | `/fault-reports` | Any authenticated | Staff: all reports; Student: own only (enforced in controller) |
| GET | `/fault-reports/:id` | Any authenticated | Single report detail |
| PATCH | `/fault-reports/:id/status` | Technologist/Engineer/Admin | Update status |

### Maintenance Logs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/maintenance-logs` | Technologist/Engineer/Admin | Log repair action against equipment/report |
| GET | `/maintenance-logs/equipment/:equipmentId` | Any authenticated | Repair history for one asset |

### Predictions / Dashboard
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/predictions/equipment/:equipmentId` | Technologist/Engineer/Admin | EHI history for one asset |
| GET | `/predictions/high-risk` | Technologist/Engineer/Admin | All assets currently flagged High Risk |
| POST | `/predictions/recalculate` | Admin (or scheduled job) | Manually trigger EHI recalculation for all assets |

---

## 8. Fault Reporting Workflow (implementation detail)

1. Frontend scans QR (`html5-qrcode`) → gets `qr_code` string → calls `GET /equipment/qr/:qrCode` to resolve `equipment_id`.
2. Form pre-fills equipment name/location; user adds description, priority, optional image.
3. Frontend sends `multipart/form-data` POST to `/fault-reports`.
4. `uploadImage.js` middleware (multer) validates:
   - Allowed MIME types only: `image/jpeg`, `image/png`, `image/webp`
   - Max size: 5MB
   - Rejects on failure with 400, does not silently accept
5. Controller creates the row with `status = 'Pending'`.
6. Staff dashboard queries `GET /fault-reports` (filtered by role) and updates status through the pipeline: `Pending → In-Progress → Resolved` (or `Scrapped`).
7. Each status change to `Resolved` should prompt creation of a `maintenance_logs` entry.

`middleware/uploadImage.js`:
```js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/fault-reports/'), // outside public web root in production
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) return cb(new Error('Invalid file type'), false);
  cb(null, true);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
```

---

## 9. Predictive Maintenance Engine (EHI)

### 9.1 Formula (bounded, as specified in the proposal)

```
EHI = 100 − [
  min(40, (operational_hours / expected_lifespan_hours) × 40) +
  min(30, (failure_count / failure_cap) × 30) +
  min(30, (days_since_last_service / service_interval_days) × 30)
]
EHI = clamp(EHI, 0, 100)
```

`services/ehiService.js`:
```js
const FAILURE_CAP = 10;              // configurable per asset class
const SERVICE_INTERVAL_DAYS = 180;   // configurable per asset class
const HIGH_RISK_THRESHOLD = 40;

function calculateEHI({ operationalHours, expectedLifespanHours, failureCount, daysSinceLastService }) {
  const usageTerm = Math.min(40, (operationalHours / expectedLifespanHours) * 40);
  const failureTerm = Math.min(30, (failureCount / FAILURE_CAP) * 30);
  const serviceTerm = Math.min(30, (daysSinceLastService / SERVICE_INTERVAL_DAYS) * 30);

  let ehi = 100 - (usageTerm + failureTerm + serviceTerm);
  ehi = Math.max(0, Math.min(100, ehi));

  const riskLevel = ehi < HIGH_RISK_THRESHOLD ? 'High' : ehi < 70 ? 'Medium' : 'Low';
  return { ehi: Math.round(ehi * 100) / 100, riskLevel };
}

module.exports = { calculateEHI, HIGH_RISK_THRESHOLD };
```

### 9.2 Operational Hours — Estimation, Not Sensing

**Important:** there is no IoT/hardware usage sensing in this system. `operational_hours` is estimated, not measured. Implement it as:

1. Primary method — **scheduled-session accrual**: a scheduled job (e.g. `node-cron`, nightly) sums `duration_hours` from `class_schedule` entries that have occurred since the last run, and increments `equipment.operational_hours`.
2. Fallback — **manual override**: Lab Technologist can directly edit `operational_hours` via `PUT /equipment/:id` when the schedule doesn't reflect reality (cancelled class, extended use).
3. **Documentation requirement:** every screen displaying EHI must note that operational hours are schedule-estimated, not sensor-measured. Do not present EHI as more precise than the input data supports.

### 9.3 Failure Count

Derived, not stored redundantly — compute as `COUNT(fault_reports WHERE equipment_id = X)` (or a filtered subset, e.g. only `Resolved`/`Scrapped` reports that represent confirmed hardware failures vs. false alarms — decide and document this rule explicitly, since it changes the score).

### 9.4 Recalculation Trigger

Run EHI recalculation:
- Nightly via scheduled job (recommended, keeps dashboard current without manual action), **and**
- On-demand via `POST /predictions/recalculate` (Admin), for demo/defense purposes.

On each calculation, insert a new `predictions` row (keep history — don't overwrite) so you can show EHI trending over time in your defense.

---

## 10. Alerts

`services/alertService.js`:
```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendHighRiskAlert(technicianEmail, equipment, ehi) {
  await transporter.sendMail({
    from: process.env.ALERT_FROM,
    to: technicianEmail,
    subject: `High Risk Alert: ${equipment.name}`,
    text: `${equipment.name} (${equipment.serial_number}) has an EHI of ${ehi}% and requires preventative service.`,
  });
}

module.exports = { sendHighRiskAlert };
```

**Logic:** when a `predictions` row is inserted with `risk_level = 'High'` and `alert_sent = false`:
1. Create an in-app notification record (simplest: a `notifications` table, or reuse `predictions.alert_sent` if you're keeping scope minimal).
2. Attempt email dispatch; on success set `alert_sent = true` so the same alert isn't re-sent every recalculation cycle.
3. Scope explicitly excludes SMS/push — do not add these mid-project.

---

## 11. QR Code Generation

`server/src/services/qrService.js`:
```js
const QRCode = require('qrcode');
const path = require('path');

// QR images are saved to client/public/qrcodes/ so the frontend can serve them
const QR_OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'client', 'public', 'qrcodes');

async function generateQR(equipmentId, serialNumber) {
  const payload = `EQUIP-${equipmentId}-${serialNumber}`;
  const filePath = path.join(QR_OUTPUT_DIR, `${payload}.png`);
  await QRCode.toFile(filePath, payload);
  return payload; // stored in equipment.qr_code
}

module.exports = { generateQR };
```

Called automatically inside `equipmentController.create` right after the row is inserted, so every new asset gets a printable tag immediately.

---

## 12. Non-Functional Requirements — Implementation Checklist

| Requirement | How to satisfy it |
|---|---|
| Security | bcrypt for passwords; JWT verified on every protected route; `authorize()` middleware on every staff-only route; multer file-type/size validation; Sequelize/parameterized queries only, never raw string SQL |
| Performance | Add indexes on `fault_reports.equipment_id`, `fault_reports.status`, `predictions.equipment_id`; paginate list endpoints (`LIMIT`/`OFFSET`) |
| Availability | Not something you "build" for a student project — document it as a target; use `pm2` or similar to auto-restart the Node process if deployed |
| Backup & Retention | `mysqldump` via a daily cron job to a separate storage location; document retention (30 days) in your deployment guide |
| Usability | Keep the fault-report form to the minimum required fields; test the QR-to-submit flow end-to-end with a real student during UAT |
| Scalability | Keep table design normalized (already done in §4); avoid hardcoding lab names — `class_schedule.lab_name` is data, not code |
| Session Management | Set JWT expiry (`expiresIn: '2h'` is reasonable); require re-login for Admin-level actions if idle too long |

---

## 13. Testing Strategy

| Test type | Tool | What to cover |
|---|---|---|
| Unit | Jest | `ehiService.calculateEHI()` — test boundary cases (0 hours, hours = lifespan, failure_count > cap, all terms maxed → EHI should floor at 0, never go negative) |
| Unit | Jest | `authorize()` middleware — correct role passes, incorrect role gets 403 |
| Integration | Supertest | Full request/response cycle for each endpoint in §7, including auth failures (401/403) |
| Integration | Supertest | Fault report creation with valid vs. invalid image types |
| UAT | Manual, with lab technologists | QR scan → submit flow; dashboard clarity; status update workflow |
| Predictive accuracy validation | Manual, against synthetic/historical data | Feed known failure patterns, confirm EHI output matches expected calculation manually — **never fabricate "accuracy %" results**; report actual computed vs. expected values only |

Example unit test for the EHI boundary case (the bug the original formula had):
```js
test('EHI never goes below 0 even with extreme inputs', () => {
  const result = calculateEHI({
    operationalHours: 100000,
    expectedLifespanHours: 1000,
    failureCount: 999,
    daysSinceLastService: 99999,
  });
  expect(result.ehi).toBe(0);
  expect(result.riskLevel).toBe('High');
});
```

---

## 14. Environment Variables (`.env.example`)

```
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=lab_fault_system
DB_USER=root
DB_PASSWORD=

JWT_SECRET=replace_with_long_random_string
JWT_EXPIRES_IN=2h

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ALERT_FROM=alerts@labfaultsystem.local
```

Never commit `.env` — only `.env.example`. Add `.env` to `.gitignore`.

---

## 15. Development Setup (from zero)

```bash
git clone <repo-url> && cd LabCare

# --- Backend setup ---
cd server
npm install
cp .env.example .env      # fill in real DB credentials
# create the MySQL database:
mysql -u root -p -e "CREATE DATABASE lab_fault_system;"
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all    # optional demo data — label clearly as synthetic
npm run dev                      # nodemon src/server.js

# --- Frontend setup (separate terminal) ---
cd ../client
npm install                      # install any frontend dependencies
```

Verify: `GET http://localhost:3000/api/v1/equipment` should return `[]` (empty inventory) on a fresh install.

---

## 16. What NOT to Build (scope guardrails)

To keep this defensible as a 4-month Waterfall thesis project, explicitly do **not** add:
- IoT/hardware sensors for real usage tracking (out of scope — see §9.2)
- Machine-learning/trained models for prediction (the EHI is a transparent rule-based formula — keep it that way; do not retrofit ML claims you can't back with real training data)
- SMS or push notifications (email + in-app only)
- Multi-institution/multi-tenant support (single-institution scope only)
- Real-time WebSocket dashboards unless there's timeline slack after core features are done and tested

---

## 17. Traceability Summary

| Objective (Section 4 of proposal) | Where it's implemented |
|---|---|
| System requirement analysis & domain modeling | §4 (schema), §6 (RBAC) |
| Equipment inventory & QR-based reporting | §8, §11 |
| Predictive maintenance engine | §9 |
| Maintenance workflow & ticket dashboard | §7 (API), §8 (workflow) |
| Waterfall testing | §13 |
| Documentation | This guide + proposal document |

Every feature you build should trace back to a row in this table. If it doesn't, it's scope creep — flag it before building it.
