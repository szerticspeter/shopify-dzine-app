#!/usr/bin/env node

/**
 * Simple script to start the Product Template Creator tool
 * This allows launching the tool directly from the UI
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const open = require('open');

// Get the absolute path to the template creator app directory
const appDir = __dirname;

// Check if node_modules exists, if not install dependencies
if (!fs.existsSync(path.join(appDir, 'node_modules'))) {
  console.log('🔍 First run detected, installing dependencies...');
  try {
    execSync('npm install', { cwd: appDir, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    process.exit(1);
  }
}

// Start the app
console.log('🚀 Starting Product Template Creator App...');
try {
  // Start the React development server
  const process = execSync('npm start', { 
    cwd: appDir, 
    stdio: 'inherit' 
  });
} catch (error) {
  console.error('❌ Error starting the app:', error.message);
  process.exit(1);
}