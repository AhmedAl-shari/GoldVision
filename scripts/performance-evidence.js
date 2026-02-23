#!/usr/bin/env node
/**
 * Performance Evidence Script
 * 
 * Measures API endpoint latencies and generates performance report
 * with p50, p95, p99 metrics for IR compliance
 * 
 * Usage:
 *   node scripts/performance-evidence.js
 *   npm run perf:test
 */

const axios = require('axios');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const SAMPLES = parseInt(process.env.PERF_SAMPLES || '20');

// Endpoints to test
const ENDPOINTS = [
  { name: 'Spot Price', path: '/prices', method: 'GET' },
  { name: 'Historical', path: '/prices?asset=XAU&currency=USD&limit=30', method: 'GET' },
  { name: 'Forecast 7d', path: '/forecast?horizon_days=7', method: 'GET' },
  { name: 'Technical Analysis', path: '/technical-analysis?period=14', method: 'GET' },
  { name: 'Trading Signal', path: '/signal', method: 'GET' },
  { name: 'Provider Status', path: '/provider/status', method: 'GET' },
  { name: 'Health Check', path: '/health', method: 'GET' },
];

/**
 * Measure endpoint latency
 */
async function measureLatency(endpoint) {
  const start = Date.now();
  try {
    await axios({
      method: endpoint.method,
      url: `${API_BASE}${endpoint.path}`,
      timeout: 10000,
      validateStatus: () => true // Accept any status
    });
    return Date.now() - start;
  } catch (error) {
    console.error(`❌ ${endpoint.name} failed:`, error.message);
    return null;
  }
}

/**
 * Calculate percentiles
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log('🚀 GoldVision Performance Evidence Collection');
  console.log('━'.repeat(60));
  console.log(`📊 Testing ${ENDPOINTS.length} endpoints with ${SAMPLES} samples each`);
  console.log(`🌐 API Base: ${API_BASE}\n`);

  const results = [];

  for (const endpoint of ENDPOINTS) {
    process.stdout.write(`Testing ${endpoint.name}... `);
    
    const latencies = [];
    
    for (let i = 0; i < SAMPLES; i++) {
      const latency = await measureLatency(endpoint);
      if (latency !== null) {
        latencies.push(latency);
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (latencies.length === 0) {
      console.log('❌ All requests failed');
      continue;
    }

    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);

    results.push({
      endpoint: endpoint.name,
      path: endpoint.path,
      samples: latencies.length,
      min,
      avg: Math.round(avg),
      p50,
      p95,
      p99,
      max,
      success_rate: ((latencies.length / SAMPLES) * 100).toFixed(1)
    });

    console.log(`✅ p50=${p50}ms p95=${p95}ms`);
  }

  return results;
}

/**
 * Display results as table
 */
function displayResults(results) {
  const table = new Table({
    head: ['Endpoint', 'Min', 'Avg', 'p50', 'p95', 'p99', 'Max', 'Success'],
    colWidths: [20, 8, 8, 8, 8, 8, 8, 10],
    style: { head: ['cyan', 'bold'] }
  });

  results.forEach(r => {
    table.push([
      r.endpoint,
      `${r.min}ms`,
      `${r.avg}ms`,
      `${r.p50}ms`,
      `${r.p95}ms`,
      `${r.p99}ms`,
      `${r.max}ms`,
      `${r.success_rate}%`
    ]);
  });

  console.log('\n📈 Performance Results:');
  console.log(table.toString());

  // Summary
  const allP95 = results.map(r => r.p95);
  const overallP95 = percentile(allP95, 95);
  
  console.log('\n📊 Summary:');
  console.log(`   Overall p95: ${overallP95}ms`);
  console.log(`   Target: <500ms (Pilot MVP)`);
  console.log(`   Status: ${overallP95 < 500 ? '✅ PASS' : '⚠️ NEEDS OPTIMIZATION'}`);
}

/**
 * Save results to JSON
 */
function saveResults(results) {
  const outputDir = path.join(__dirname, '../performance-reports');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `perf-report-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  const report = {
    timestamp: new Date().toISOString(),
    api_base: API_BASE,
    samples_per_endpoint: SAMPLES,
    results,
    summary: {
      total_endpoints: results.length,
      overall_p95: percentile(results.map(r => r.p95), 95),
      overall_p50: percentile(results.map(r => r.p50), 50),
    }
  };

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved: ${filepath}`);
  
  // Also save latest
  const latestPath = path.join(outputDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  console.log(`💾 Latest report: ${latestPath}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await runPerformanceTests();
    
    if (results.length === 0) {
      console.error('\n❌ No successful tests. Is the server running?');
      process.exit(1);
    }

    displayResults(results);
    saveResults(results);
    
    console.log('\n✅ Performance evidence collection complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { runPerformanceTests, percentile };

