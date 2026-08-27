const { calculateEHI, HIGH_RISK_THRESHOLD, FAILURE_CAP, SERVICE_INTERVAL_DAYS } = require('../../server/src/services/ehiService');

function runUnitTests() {
  const results = [];

  function assert(testId, name, condition, details = '') {
    results.push({
      testId,
      suite: 'Unit Tests (EHI Formula & Bounding)',
      name,
      status: condition ? 'PASSED' : 'FAILED',
      details,
    });
  }

  // UT-01: Pristine Equipment
  const t1 = calculateEHI({ operationalHours: 0, expectedLifespanHours: 5000, failureCount: 0, daysSinceLastService: 0 });
  assert('UT-01', 'Pristine Equipment Health (EHI = 100, Low Risk)', t1.ehi === 100 && t1.riskLevel === 'Low', `Got EHI: ${t1.ehi}, Risk: ${t1.riskLevel}`);

  // UT-02: Usage Term Bounding (Max 40 pts penalty)
  const t2 = calculateEHI({ operationalHours: 10000, expectedLifespanHours: 5000, failureCount: 0, daysSinceLastService: 0 });
  assert('UT-02', 'Usage Term Cap (Max 40 points penalty when operational > lifespan)', t2.ehi === 60 && t2.riskLevel === 'Medium', `Got EHI: ${t2.ehi}, Expected: 60`);

  // UT-03: Failure Term Bounding (Max 30 pts penalty)
  const t3 = calculateEHI({ operationalHours: 0, expectedLifespanHours: 5000, failureCount: 25, daysSinceLastService: 0 });
  assert('UT-03', 'Failure Count Term Cap (Max 30 points penalty when failures > cap)', t3.ehi === 70 && t3.riskLevel === 'Low', `Got EHI: ${t3.ehi}, Expected: 70`);

  // UT-04: Service Term Bounding (Max 30 pts penalty)
  const t4 = calculateEHI({ operationalHours: 0, expectedLifespanHours: 5000, failureCount: 0, daysSinceLastService: 365 });
  assert('UT-04', 'Service Interval Term Cap (Max 30 points penalty when overdue)', t4.ehi === 70 && t4.riskLevel === 'Low', `Got EHI: ${t4.ehi}, Expected: 70`);

  // UT-05: High Risk Classification (< 40%)
  const t5 = calculateEHI({ operationalHours: 4500, expectedLifespanHours: 5000, failureCount: 8, daysSinceLastService: 150 });
  assert('UT-05', 'High Risk Classification (EHI < 40 correctly triggers High Risk)', t5.ehi < 40 && t5.riskLevel === 'High', `Got EHI: ${t5.ehi}, Risk: ${t5.riskLevel}`);

  // UT-06: Absolute Lower Bound Floor (EHI >= 0)
  const t6 = calculateEHI({ operationalHours: 999999, expectedLifespanHours: 1000, failureCount: 999, daysSinceLastService: 9999 });
  assert('UT-06', 'Strict Mathematical Floor (EHI never drops below 0 under extreme wear)', t6.ehi === 0 && t6.riskLevel === 'High', `Got EHI: ${t6.ehi}, Expected: 0`);

  return results;
}

module.exports = { runUnitTests };
