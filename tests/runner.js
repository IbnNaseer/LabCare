const fs = require('fs');
const path = require('path');
const { runUnitTests } = require('./unit/ehi_formula.test');
const { runIntegrationTests } = require('./integration/api_suite.test');

async function main() {
  console.log('\n=============================================================');
  console.log('  🧪 LABCARE TEST SUITE EXECUTION & VERIFICATION RUNNER');
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('=============================================================\n');

  const unitResults = runUnitTests();
  const integrationResults = await runIntegrationTests();

  const allResults = [...unitResults, ...integrationResults];
  const passedCount = allResults.filter(r => r.status === 'PASSED').length;
  const failedCount = allResults.filter(r => r.status === 'FAILED').length;

  console.log('--- 1. UNIT TESTS ---');
  unitResults.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`  ${icon} [${r.testId}] ${r.name} -> ${r.status} (${r.details})`);
  });

  console.log('\n--- 2. INTEGRATION & API TESTS ---');
  integrationResults.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`  ${icon} [${r.testId}] ${r.name} -> ${r.status} (${r.details})`);
  });

  console.log('\n=============================================================');
  console.log(`  TOTAL TESTS: ${allResults.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('=============================================================\n');

  // Save log output to tests/results/latest_run.log
  const logContent = [
    `LabCare Test Run Evidence`,
    `Execution Date: ${new Date().toUTCString()}`,
    `Total Tests: ${allResults.length} | Passed: ${passedCount} | Failed: ${failedCount}`,
    `-------------------------------------------------------------`,
    ...allResults.map(r => `[${r.testId}] [${r.status}] ${r.suite} - ${r.name}: ${r.details}`)
  ].join('\n');

  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'latest_run.log'), logContent, 'utf8');
  console.log(`📁 Test execution evidence written to tests/results/latest_run.log\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main();
