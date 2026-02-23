#!/usr/bin/env node
/**
 * Backend setup script for e2e tests
 * Ensures the backend server is running before tests start
 */

const { spawn } = require('child_process');
const http = require('http');

const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

function checkBackendHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BACKEND_URL}/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Backend returned status ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Backend health check timeout'));
    });
  });
}

async function waitForBackend() {
  console.log('🔍 Checking if backend is running...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await checkBackendHealth();
      console.log('✅ Backend is running and healthy');
      return true;
    } catch (error) {
      if (i === MAX_RETRIES - 1) {
        console.error('❌ Backend is not responding after maximum retries');
        console.error('Please ensure the backend server is running on', BACKEND_URL);
        process.exit(1);
      }
      
      console.log(`⏳ Backend not ready, retrying in ${RETRY_DELAY}ms... (${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function startBackendIfNeeded() {
  try {
    await checkBackendHealth();
    console.log('✅ Backend is already running');
    return;
  } catch (error) {
    console.log('🚀 Starting backend server...');
    
    const backendProcess = spawn('python3', [
      '-c',
      `
import uvicorn
from src.main import app
print('🚀 Starting GoldVision Backend for e2e tests...')
uvicorn.run(app, host='0.0.0.0', port=8000, log_level='warning')
      `
    ], {
      cwd: '../backend',
      stdio: 'pipe'
    });

    // Handle process exit
    backendProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error('❌ Backend process exited with code', code);
        process.exit(1);
      }
    });

    // Wait for backend to start
    await waitForBackend();
    
    // Keep the process running
    process.on('exit', () => {
      backendProcess.kill();
    });
  }
}

if (require.main === module) {
  startBackendIfNeeded().catch((error) => {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  });
}

module.exports = { waitForBackend, startBackendIfNeeded };
