import type { ExportResult } from '../types.js';

export function printSummary(result: ExportResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Export Summary:');
  console.log('='.repeat(60));
  console.log(`   Total threads: ${result.count ?? 0}`);
  console.log(`   ✅ Successfully exported: ${result.successCount ?? 0}`);
  console.log(`   ❌ Failed: ${result.errorCount ?? 0}`);

  if (result.data) {
    const withSteps = result.data.filter((t) => t.steps && t.steps.length > 0).length;
    console.log(`   📝 With steps: ${withSteps}`);
    const missing = (result.successCount ?? 0) - withSteps;
    if (missing > 0) {
      console.log(`   ⚠️  Missing steps: ${missing} threads have no steps!`);
    }
  }

  console.log('='.repeat(60));
}
