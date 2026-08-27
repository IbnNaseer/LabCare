const { calculateEHI, HIGH_RISK_THRESHOLD } = require('../../src/services/ehiService');

describe('EHI Service Unit Tests', () => {
  test('EHI is 100 for brand new equipment with 0 usage, 0 failures, and 0 days since service', () => {
    const result = calculateEHI({
      operationalHours: 0,
      expectedLifespanHours: 5000,
      failureCount: 0,
      daysSinceLastService: 0,
    });
    expect(result.ehi).toBe(100);
    expect(result.riskLevel).toBe('Low');
  });

  test('EHI never drops below 0 even under extreme wear, excessive failures, and overdue service', () => {
    const result = calculateEHI({
      operationalHours: 999999,
      expectedLifespanHours: 1000,
      failureCount: 999,
      daysSinceLastService: 99999,
    });
    expect(result.ehi).toBe(0);
    expect(result.riskLevel).toBe('High');
  });

  test('EHI correctly classifies High risk (< 40)', () => {
    const result = calculateEHI({
      operationalHours: 5000,
      expectedLifespanHours: 5000,
      failureCount: 10,
      daysSinceLastService: 0,
    });
    expect(result.ehi).toBe(30);
    expect(result.riskLevel).toBe('High');
  });

  test('EHI correctly classifies Medium risk (40 <= EHI < 70)', () => {
    const result = calculateEHI({
      operationalHours: 5000,
      expectedLifespanHours: 5000,
      failureCount: 0,
      daysSinceLastService: 0,
    });
    expect(result.ehi).toBe(60);
    expect(result.riskLevel).toBe('Medium');
  });

  test('EHI correctly classifies Low risk (>= 70)', () => {
    const result = calculateEHI({
      operationalHours: 2500,
      expectedLifespanHours: 5000,
      failureCount: 0,
      daysSinceLastService: 0,
    });
    expect(result.ehi).toBe(80);
    expect(result.riskLevel).toBe('Low');
  });
});
