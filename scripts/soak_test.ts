#!/usr/bin/env ts-node

/**
 * GoldVision Soak Test
 * 
 * Runs a 30-minute load test against key endpoints to measure:
 * - Response times (p50, p95, p99)
 * - Error rates
 * - System stability under sustained load
 * 
 * Usage: npm run soak-test
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

interface TestResult {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  error?: string;
  timestamp: number;
}

interface SoakTestConfig {
  duration: number; // in minutes
  interval: number; // in milliseconds
  endpoints: Array<{
    url: string;
    method: 'GET' | 'POST';
    data?: any;
    weight: number; // relative frequency
  }>;
}

interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  responseTimes: number[];
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  avgResponseTime: number;
}

class SoakTester {
  private config: SoakTestConfig;
  private results: TestResult[] = [];
  private startTime: number = 0;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(config: SoakTestConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: any): Promise<TestResult> {
    const startTime = performance.now();
    const timestamp = Date.now();

    try {
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        data: endpoint.data,
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GoldVision-SoakTest/1.0'
        }
      });

      const responseTime = performance.now() - startTime;

      return {
        endpoint: endpoint.url,
        method: endpoint.method,
        responseTime,
        statusCode: response.status,
        timestamp
      };
    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      
      return {
        endpoint: endpoint.url,
        method: endpoint.method,
        responseTime,
        statusCode: error.response?.status || 0,
        error: error.message,
        timestamp
      };
    }
  }

  private selectEndpoint(): any {
    const totalWeight = this.config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0]; // fallback
  }

  private async runTestCycle(): Promise<void> {
    const endpoint = this.selectEndpoint();
    const result = await this.makeRequest(endpoint);
    this.results.push(result);

    // Log progress every 100 requests
    if (this.results.length % 100 === 0) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      console.log(`[${new Date().toISOString()}] Completed ${this.results.length} requests in ${elapsed.toFixed(1)}s`);
    }
  }

  private calculateMetrics(): Metrics {
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const successfulRequests = this.results.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const failedRequests = this.results.length - successfulRequests;
    
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    return {
      totalRequests: this.results.length,
      successfulRequests,
      failedRequests,
      responseTimes,
      errorRate: failedRequests / this.results.length,
      p50,
      p95,
      p99,
      avgResponseTime
    };
  }

  private logMetrics(metrics: Metrics): void {
    console.log('\n' + '='.repeat(60));
    console.log('SOAK TEST METRICS');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${metrics.totalRequests}`);
    console.log(`Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${metrics.failedRequests} (${(metrics.errorRate * 100).toFixed(1)}%)`);
    console.log(`Average Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`P50 Response Time: ${metrics.p50.toFixed(2)}ms`);
    console.log(`P95 Response Time: ${metrics.p95.toFixed(2)}ms`);
    console.log(`P99 Response Time: ${metrics.p99.toFixed(2)}ms`);
    console.log('='.repeat(60));

    // Check for performance issues
    if (metrics.p95 > 800) {
      console.log(`⚠️  WARNING: P95 response time (${metrics.p95.toFixed(2)}ms) exceeds 800ms threshold`);
    }
    
    if (metrics.errorRate > 0.05) {
      console.log(`⚠️  WARNING: Error rate (${(metrics.errorRate * 100).toFixed(1)}%) exceeds 5% threshold`);
    }

    // Log endpoint-specific metrics
    const endpointMetrics = new Map<string, Metrics>();
    
    for (const result of this.results) {
      const key = `${result.method} ${result.endpoint}`;
      if (!endpointMetrics.has(key)) {
        endpointMetrics.set(key, {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          responseTimes: [],
          errorRate: 0,
          p50: 0,
          p95: 0,
          p99: 0,
          avgResponseTime: 0
        });
      }
      
      const metrics = endpointMetrics.get(key)!;
      metrics.totalRequests++;
      metrics.responseTimes.push(result.responseTime);
      
      if (result.statusCode >= 200 && result.statusCode < 300) {
        metrics.successfulRequests++;
      } else {
        metrics.failedRequests++;
      }
    }

    console.log('\nENDPOINT-SPECIFIC METRICS:');
    console.log('-'.repeat(60));
    
    for (const [endpoint, metrics] of endpointMetrics) {
      const sortedTimes = metrics.responseTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
      const avg = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
      
      console.log(`${endpoint}:`);
      console.log(`  Requests: ${metrics.totalRequests}, Success: ${metrics.successfulRequests}, Failed: ${metrics.failedRequests}`);
      console.log(`  Avg: ${avg.toFixed(2)}ms, P50: ${p50.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
    }
  }

  private async checkSystemHealth(): Promise<void> {
    try {
      const healthResponse = await axios.get('http://localhost:8000/health', { timeout: 5000 });
      if (healthResponse.status !== 200) {
        console.log(`⚠️  Health check failed: ${healthResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️  Health check error: ${error}`);
    }
  }

  async start(): Promise<void> {
    console.log('🚀 Starting GoldVision Soak Test');
    console.log(`Duration: ${this.config.duration} minutes`);
    console.log(`Interval: ${this.config.interval}ms`);
    console.log(`Endpoints: ${this.config.endpoints.length}`);
    console.log('');

    this.startTime = Date.now();
    this.isRunning = true;

    // Initial health check
    await this.checkSystemHealth();

    // Start test cycles
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.runTestCycle();
        
        // Check if we've reached the duration limit
        const elapsed = (Date.now() - this.startTime) / 1000 / 60; // minutes
        if (elapsed >= this.config.duration) {
          await this.stop();
        }
      }
    }, this.config.interval);

    // Periodic health checks
    const healthCheckInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.checkSystemHealth();
      } else {
        clearInterval(healthCheckInterval);
      }
    }, 60000); // Every minute

    // Wait for completion
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (!this.isRunning) {
          resolve();
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      checkCompletion();
    });
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Stopping soak test...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    const metrics = this.calculateMetrics();
    this.logMetrics(metrics);

    // Save results to file
    const fs = require('fs');
    const path = require('path');
    
    const resultsDir = path.join(__dirname, '..', 'artifacts');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const resultsFile = path.join(resultsDir, `soak-test-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({
      config: this.config,
      metrics,
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📊 Results saved to: ${resultsFile}`);
  }
}

// Configuration
const config: SoakTestConfig = {
  duration: 30, // 30 minutes
  interval: 1000, // 1 second between requests
  endpoints: [
    {
      url: 'http://localhost:8000/forecast',
      method: 'POST',
      data: {
        rows: [
          { ds: '2025-10-01', price: 2000 },
          { ds: '2025-10-02', price: 2010 },
          { ds: '2025-10-03', price: 2005 }
        ],
        horizon_days: 7
      },
      weight: 3 // 30% of requests
    },
    {
      url: 'http://localhost:8000/news',
      method: 'GET',
      weight: 4 // 40% of requests
    },
    {
      url: 'http://localhost:8000/copilot/ask',
      method: 'POST',
      data: {
        message: 'What is the current gold price trend?',
        context: { currentPage: 'dashboard' }
      },
      weight: 2 // 20% of requests
    },
    {
      url: 'http://localhost:8000/prices',
      method: 'GET',
      weight: 1 // 10% of requests
    }
  ]
};

// Run the test
async function main() {
  const tester = new SoakTester(config);
  
  try {
    await tester.start();
  } catch (error) {
    console.error('❌ Soak test failed:', error);
    process.exit(1);
  }
  
  console.log('✅ Soak test completed successfully');
  process.exit(0);
}

if (require.main === module) {
  main();
}

export { SoakTester, SoakTestConfig, Metrics };
