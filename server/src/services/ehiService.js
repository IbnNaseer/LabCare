const FAILURE_CAP = 10;
const SERVICE_INTERVAL_DAYS = 180;
const HIGH_RISK_THRESHOLD = 40;

/**
 * Calculates Equipment Health Index (EHI) based on usage, failure history, and service intervals.
 *
 * @param {Object} params
 * @param {number} params.operationalHours - Estimated operational hours
 * @param {number} params.expectedLifespanHours - Expected total lifespan in hours
 * @param {number} params.failureCount - Number of confirmed failures/faults
 * @param {number} params.daysSinceLastService - Number of days since last maintenance
 * @returns {{ ehi: number, riskLevel: 'Low'|'Medium'|'High' }}
 */
function calculateEHI({
  operationalHours = 0,
  expectedLifespanHours = 1000,
  failureCount = 0,
  daysSinceLastService = 0,
}) {
  const safeLifespan = expectedLifespanHours > 0 ? expectedLifespanHours : 1;
  const safeOperational = Math.max(0, operationalHours);
  const safeFailures = Math.max(0, failureCount);
  const safeDaysSinceService = Math.max(0, daysSinceLastService);

  const usageTerm = Math.min(40, (safeOperational / safeLifespan) * 40);
  const failureTerm = Math.min(30, (safeFailures / FAILURE_CAP) * 30);
  const serviceTerm = Math.min(30, (safeDaysSinceService / SERVICE_INTERVAL_DAYS) * 30);

  let ehi = 100 - (usageTerm + failureTerm + serviceTerm);
  ehi = Math.max(0, Math.min(100, ehi));

  const riskLevel = ehi < HIGH_RISK_THRESHOLD ? 'High' : ehi < 70 ? 'Medium' : 'Low';

  return {
    ehi: Math.round(ehi * 100) / 100,
    riskLevel,
  };
}

module.exports = {
  calculateEHI,
  FAILURE_CAP,
  SERVICE_INTERVAL_DAYS,
  HIGH_RISK_THRESHOLD,
};
