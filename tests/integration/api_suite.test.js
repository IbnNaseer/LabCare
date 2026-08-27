const BASE_URL = 'http://localhost:3000/api/v1';

async function runIntegrationTests() {
  const results = [];

  function assert(testId, name, condition, details = '') {
    results.push({
      testId,
      suite: 'Integration Tests (API Endpoints & RBAC)',
      name,
      status: condition ? 'PASSED' : 'FAILED',
      details,
    });
  }

  let adminToken = '';
  let studentToken = '';

  // IT-01: Health check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert('IT-01', 'API Health Check Endpoint (GET /health)', res.status === 200 && data.status === 'ok', `HTTP ${res.status}`);
  } catch (e) {
    assert('IT-01', 'API Health Check Endpoint (GET /health)', false, e.message);
  }

  // IT-02: Admin Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fud.edu.ng', password: 'password123' }),
    });
    const data = await res.json();
    adminToken = data.data?.token || '';
    assert('IT-02', 'Admin Authentication & JWT Issuance (POST /auth/login)', res.status === 200 && !!adminToken, `User: ${data.data?.user?.name}, Role: ${data.data?.user?.role}`);
  } catch (e) {
    assert('IT-02', 'Admin Authentication & JWT Issuance (POST /auth/login)', false, e.message);
  }

  // IT-03: Student Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@fud.edu.ng', password: 'password123' }),
    });
    const data = await res.json();
    studentToken = data.data?.token || '';
    assert('IT-03', 'Student Authentication & JWT Issuance (POST /auth/login)', res.status === 200 && !!studentToken, `User: ${data.data?.user?.name}, Role: ${data.data?.user?.role}`);
  } catch (e) {
    assert('IT-03', 'Student Authentication & JWT Issuance (POST /auth/login)', false, e.message);
  }

  // IT-04: Profile retrieval with JWT
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert('IT-04', 'Bearer Token Verification (GET /auth/me)', res.status === 200 && data.data?.email === 'admin@fud.edu.ng', `Verified: ${data.data?.name}`);
  } catch (e) {
    assert('IT-04', 'Bearer Token Verification (GET /auth/me)', false, e.message);
  }

  // IT-05: Equipment Inventory Listing
  try {
    const res = await fetch(`${BASE_URL}/equipment`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const count = data.data?.equipment?.length || 0;
    assert('IT-05', 'Equipment Inventory Retrieval (GET /equipment)', res.status === 200 && count > 0, `Retrieved ${count} assets`);
  } catch (e) {
    assert('IT-05', 'Equipment Inventory Retrieval (GET /equipment)', false, e.message);
  }

  // IT-06: QR Code Resolution
  try {
    const res = await fetch(`${BASE_URL}/equipment/qr/EQUIP-1-SN-MC-89240`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert('IT-06', 'QR Asset Tag Resolution (GET /equipment/qr/:qrCode)', res.status === 200 && data.data?.name.includes('Microscope'), `Resolved: ${data.data?.name}`);
  } catch (e) {
    assert('IT-06', 'QR Asset Tag Resolution (GET /equipment/qr/:qrCode)', false, e.message);
  }

  // IT-07: RBAC Protection - Student Forbidden from Staff Dashboard
  try {
    const res = await fetch(`${BASE_URL}/predictions/dashboard-summary`, {
      headers: { 'Authorization': `Bearer ${studentToken}` },
    });
    assert('IT-07', 'RBAC Enforcement: Student Forbidden on Staff Routes (403)', res.status === 403, `HTTP ${res.status} (Expected 403 Forbidden)`);
  } catch (e) {
    assert('IT-07', 'RBAC Enforcement: Student Forbidden on Staff Routes (403)', false, e.message);
  }

  // IT-08: Staff Dashboard Summary Access (Admin/Technologist)
  try {
    const res = await fetch(`${BASE_URL}/predictions/dashboard-summary`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert('IT-08', 'Staff Predictive Analytics Dashboard (GET /predictions/dashboard-summary)', res.status === 200 && !!data.data?.kpis, `KPIs: ${JSON.stringify(data.data?.kpis)}`);
  } catch (e) {
    assert('IT-08', 'Staff Predictive Analytics Dashboard (GET /predictions/dashboard-summary)', false, e.message);
  }

  return results;
}

module.exports = { runIntegrationTests };
