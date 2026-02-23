#!/usr/bin/env node
/**
 * Comprehensive API endpoint integration tests
 * Tests all major API endpoints with proper assertions
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:8000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test configuration
const TEST_USER = {
  email: 'demo@goldvision.com',
  password: 'demo123'
};

let authToken = null;
let testUserId = null;

/**
 * Helper function to make authenticated requests
 */
async function authenticatedRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...headers
    },
    timeout: TEST_TIMEOUT
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message }
    };
  }
}

/**
 * Helper function to make unauthenticated requests
 */
async function unauthenticatedRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: TEST_TIMEOUT
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message }
    };
  }
}

/**
 * Test suite results tracker
 */
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}${message ? `: ${message}` : ''}`);
  } else {
    testResults.failed++;
    console.error(`❌ ${name}${message ? `: ${message}` : ''}`);
  }
}

/**
 * Authentication Tests
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Endpoints...');
  
  // Test login
  const loginResult = await unauthenticatedRequest('POST', '/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (loginResult.success && loginResult.data.access_token) {
    authToken = loginResult.data.access_token;
    testUserId = loginResult.data.user?.id;
    recordTest('POST /auth/login', true, 'Login successful');
  } else {
    recordTest('POST /auth/login', false, `Status: ${loginResult.status}`);
    return false;
  }

  // Test get current user
  const meResult = await authenticatedRequest('GET', '/auth/me');
  if (meResult.success && meResult.data.email) {
    recordTest('GET /auth/me', true, `User: ${meResult.data.email}`);
  } else {
    recordTest('GET /auth/me', false, `Status: ${meResult.status}`);
  }

  // Test refresh token
  if (loginResult.data.refresh_token) {
    const refreshResult = await unauthenticatedRequest('POST', '/auth/refresh', {
      refresh_token: loginResult.data.refresh_token
    });
    recordTest('POST /auth/refresh', refreshResult.success, 
      refreshResult.success ? 'Token refreshed' : `Status: ${refreshResult.status}`);
  }

  return true;
}

/**
 * Health & Monitoring Tests
 */
async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health & Monitoring Endpoints...');

  const endpoints = [
    { path: '/health', name: 'Health Check' },
    { path: '/health/detailed', name: 'Detailed Health' },
    { path: '/ready', name: 'Readiness Probe' },
    { path: '/live', name: 'Liveness Probe' },
    { path: '/metrics', name: 'Prometheus Metrics' },
    { path: '/metrics/json', name: 'JSON Metrics' }
  ];

  for (const endpoint of endpoints) {
    const result = await unauthenticatedRequest('GET', endpoint.path);
    recordTest(`GET ${endpoint.path}`, result.success, 
      result.success ? endpoint.name : `Status: ${result.status}`);
  }
}

/**
 * Price Endpoints Tests
 */
async function testPriceEndpoints() {
  console.log('\n💰 Testing Price Endpoints...');

  // Get prices
  const pricesResult = await unauthenticatedRequest('GET', '/prices', null, {
    params: { limit: 10 }
  });
  recordTest('GET /prices', pricesResult.success, 
    pricesResult.success ? `Retrieved prices` : `Status: ${pricesResult.status}`);

  // Get OHLC data
  const ohlcResult = await unauthenticatedRequest('GET', '/ohlc', null, {
    params: { limit: 10 }
  });
  recordTest('GET /ohlc', ohlcResult.success, 
    ohlcResult.success ? 'OHLC data retrieved' : `Status: ${ohlcResult.status}`);

  // Get latest price (admin only)
  const latestResult = await authenticatedRequest('POST', '/fetch-latest');
  recordTest('POST /fetch-latest', latestResult.success || latestResult.status === 403, 
    latestResult.status === 403 ? 'Properly protected (403)' : 
    latestResult.success ? 'Latest price fetched' : `Status: ${latestResult.status}`);
}

/**
 * Forecast Endpoints Tests
 */
async function testForecastEndpoints() {
  console.log('\n📈 Testing Forecast Endpoints...');

  // Basic forecast
  const forecastResult = await unauthenticatedRequest('POST', '/forecast', {
    horizon_days: 7
  });
  recordTest('POST /forecast', forecastResult.success, 
    forecastResult.success ? 'Forecast generated' : `Status: ${forecastResult.status}`);

  // Enhanced forecast
  const enhancedResult = await unauthenticatedRequest('POST', '/forecast/enhanced', {
    horizon_days: 14,
    mode: 'basic'
  });
  recordTest('POST /forecast/enhanced', enhancedResult.success, 
    enhancedResult.success ? 'Enhanced forecast generated' : `Status: ${enhancedResult.status}`);

  // Forecast accuracy stats
  const accuracyResult = await unauthenticatedRequest('GET', '/forecast/accuracy/stats');
  recordTest('GET /forecast/accuracy/stats', accuracyResult.success, 
    accuracyResult.success ? 'Accuracy stats retrieved' : `Status: ${accuracyResult.status}`);
}

/**
 * Alert Endpoints Tests
 */
async function testAlertEndpoints() {
  console.log('\n🔔 Testing Alert Endpoints...');

  // Get alerts
  const getAlertsResult = await authenticatedRequest('GET', '/alerts');
  recordTest('GET /alerts', getAlertsResult.success, 
    getAlertsResult.success ? 'Alerts retrieved' : `Status: ${getAlertsResult.status}`);

  // Create alert
  const createAlertResult = await authenticatedRequest('POST', '/alerts', {
    type: 'above',
    threshold: 2500,
    currency: 'USD',
    asset: 'XAU',
    enabled: true
  });
  
  let alertId = null;
  if (createAlertResult.success && createAlertResult.data.id) {
    alertId = createAlertResult.data.id;
    recordTest('POST /alerts', true, `Alert created: ${alertId}`);
  } else {
    recordTest('POST /alerts', false, `Status: ${createAlertResult.status}`);
  }

  // Delete alert if created
  if (alertId) {
    const deleteResult = await authenticatedRequest('DELETE', `/alerts/${alertId}`);
    recordTest('DELETE /alerts/:id', deleteResult.success, 
      deleteResult.success ? 'Alert deleted' : `Status: ${deleteResult.status}`);
  }
}

/**
 * Backtest Endpoints Tests
 */
async function testBacktestEndpoints() {
  console.log('\n🧪 Testing Backtest Endpoints...');

  // Run backtest
  const backtestResult = await unauthenticatedRequest('GET', '/backtest', null, {
    params: {
      horizon: 7,
      step: 5,
      min_train: 30,
      max_cutoffs: 2
    }
  });
  
  if (backtestResult.success) {
    const hasRows = backtestResult.data.rows && backtestResult.data.rows.length > 0;
    const hasAvg = backtestResult.data.avg && backtestResult.data.avg.avg_mae !== undefined;
    recordTest('GET /backtest', hasRows && hasAvg, 
      hasRows && hasAvg ? 'Backtest completed with results' : 'Missing expected data structure');
  } else {
    recordTest('GET /backtest', false, `Status: ${backtestResult.status}`);
  }

  // Download CSV
  const csvResult = await unauthenticatedRequest('GET', '/backtest/download');
  recordTest('GET /backtest/download', csvResult.success || csvResult.status === 200, 
    csvResult.success ? 'CSV downloaded' : `Status: ${csvResult.status}`);
}

/**
 * Trading Signal Tests
 */
async function testTradingSignalEndpoints() {
  console.log('\n📊 Testing Trading Signal Endpoints...');

  const signalResult = await unauthenticatedRequest('GET', '/signal', null, {
    params: { asset: 'XAU', currency: 'USD' }
  });
  
  if (signalResult.success) {
    const hasSignal = signalResult.data.signal && ['BUY', 'HOLD', 'SELL'].includes(signalResult.data.signal);
    recordTest('GET /signal', hasSignal, 
      hasSignal ? `Signal: ${signalResult.data.signal}` : 'Invalid signal format');
  } else {
    recordTest('GET /signal', false, `Status: ${signalResult.status}`);
  }
}

/**
 * Technical Analysis Tests
 */
async function testTechnicalAnalysisEndpoints() {
  console.log('\n🔬 Testing Technical Analysis Endpoints...');

  const taResult = await unauthenticatedRequest('GET', '/technical-analysis', null, {
    params: { period: 14, limit: 60 }
  });
  
  if (taResult.success) {
    const hasIndicators = taResult.data.rsi !== undefined && taResult.data.macd !== undefined;
    recordTest('GET /technical-analysis', hasIndicators, 
      hasIndicators ? 'Technical indicators retrieved' : 'Missing expected indicators');
  } else {
    recordTest('GET /technical-analysis', false, `Status: ${taResult.status}`);
  }

  // Advanced technical analysis
  const advancedResult = await unauthenticatedRequest('GET', '/analysis/technical/advanced', null, {
    params: { asset: 'XAU', days: 30 }
  });
  recordTest('GET /analysis/technical/advanced', advancedResult.success, 
    advancedResult.success ? 'Advanced analysis retrieved' : `Status: ${advancedResult.status}`);
}

/**
 * News Endpoints Tests
 */
async function testNewsEndpoints() {
  console.log('\n📰 Testing News Endpoints...');

  const newsResult = await unauthenticatedRequest('GET', '/news', null, {
    params: { limit: 10, offset: 0 }
  });
  recordTest('GET /news', newsResult.success, 
    newsResult.success ? 'News retrieved' : `Status: ${newsResult.status}`);

  // News search
  const searchResult = await unauthenticatedRequest('GET', '/news/search', null, {
    params: { q: 'gold', limit: 5 }
  });
  recordTest('GET /news/search', searchResult.success, 
    searchResult.success ? 'News search working' : `Status: ${searchResult.status}`);
}

/**
 * Yemen Endpoints Tests
 */
async function testYemenEndpoints() {
  console.log('\n🇾🇪 Testing Yemen-Specific Endpoints...');

  const yemenPricesResult = await unauthenticatedRequest('GET', '/yemen/prices', null, {
    params: { region: 'ADEN', currency: 'YER' }
  });
  recordTest('GET /yemen/prices', yemenPricesResult.success, 
    yemenPricesResult.success ? 'Yemen prices retrieved' : `Status: ${yemenPricesResult.status}`);

  const regionsResult = await unauthenticatedRequest('GET', '/yemen/regions');
  recordTest('GET /yemen/regions', regionsResult.success, 
    regionsResult.success ? 'Regions retrieved' : `Status: ${regionsResult.status}`);
}

/**
 * Admin Endpoints Tests
 */
async function testAdminEndpoints() {
  console.log('\n👑 Testing Admin Endpoints...');

  const adminEndpoints = [
    { path: '/admin/build-info', name: 'Build Info' },
    { path: '/admin/metrics', name: 'Admin Metrics' },
    { path: '/admin/data-source', name: 'Data Source' },
    { path: '/admin/scheduler', name: 'Scheduler Status' }
  ];

  for (const endpoint of adminEndpoints) {
    const result = await authenticatedRequest('GET', endpoint.path);
    // Admin endpoints should return 200 or 403 if not admin
    const isSuccess = result.success || result.status === 403;
    recordTest(`GET ${endpoint.path}`, isSuccess, 
      isSuccess ? (result.success ? endpoint.name : 'Properly protected') : `Status: ${result.status}`);
  }
}

/**
 * Provider Status Tests
 */
async function testProviderEndpoints() {
  console.log('\n🔌 Testing Provider Endpoints...');

  const providerResult = await unauthenticatedRequest('GET', '/provider/status');
  if (providerResult.success) {
    const hasStatus = providerResult.data.primary || providerResult.data.fallback;
    recordTest('GET /provider/status', hasStatus, 
      hasStatus ? 'Provider status retrieved' : 'Missing provider data');
  } else {
    recordTest('GET /provider/status', false, `Status: ${providerResult.status}`);
  }
}

/**
 * Error Handling Tests
 */
async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...');

  // Test 404
  const notFoundResult = await unauthenticatedRequest('GET', '/nonexistent-endpoint');
  recordTest('404 Error Handling', notFoundResult.status === 404, 
    notFoundResult.status === 404 ? 'Proper 404 response' : `Status: ${notFoundResult.status}`);

  // Test invalid request
  const invalidResult = await unauthenticatedRequest('POST', '/forecast', {
    invalid_field: 'test'
  });
  recordTest('400 Error Handling', invalidResult.status === 400 || invalidResult.status === 422, 
    (invalidResult.status === 400 || invalidResult.status === 422) ? 'Proper validation error' : `Status: ${invalidResult.status}`);

  // Test unauthorized
  const unauthorizedResult = await authenticatedRequest('GET', '/admin/metrics');
  // Should be 200 if admin, 403 if not
  recordTest('403 Error Handling', unauthorizedResult.status === 403 || unauthorizedResult.success, 
    unauthorizedResult.status === 403 ? 'Proper 403 response' : 
    unauthorizedResult.success ? 'Admin access granted' : `Status: ${unauthorizedResult.status}`);
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Integration Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('=' .repeat(60));

  try {
    // Run authentication first
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.error('\n⚠️  Authentication failed. Some tests will be skipped.');
    }

    // Run all test suites
    await testHealthEndpoints();
    await testPriceEndpoints();
    await testForecastEndpoints();
    if (authSuccess) {
      await testAlertEndpoints();
      await testAdminEndpoints();
    }
    await testBacktestEndpoints();
    await testTradingSignalEndpoints();
    await testTechnicalAnalysisEndpoints();
    await testNewsEndpoints();
    await testYemenEndpoints();
    await testProviderEndpoints();
    await testErrorHandling();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.skipped}`);
    console.log(`📈 Total: ${testResults.passed + testResults.failed}`);
    console.log(`🎯 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Test suite crashed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testResults };

