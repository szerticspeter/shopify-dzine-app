#!/usr/bin/env node

/**
 * External launcher script for Template Tools
 * This script can be executed from the UI when the admin button is clicked
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');

// Check command line args
const args = process.argv.slice(2);
const tool = args[0] || 'product-template-creator-app';

// Get the path to the selected tool
const toolDir = path.join(__dirname, tool);

console.log(`🚀 Launching ${tool}...`);
console.log(`Tool directory: ${toolDir}`);

// Check if directory exists
if (!fs.existsSync(toolDir)) {
  console.error(`❌ Error: Could not find ${tool} directory`);
  process.exit(1);
}

// If it's the auto-rectanguler tool, just open the HTML file in the default browser
if (tool === 'auto-rectanguler') {
  const htmlPath = path.join(toolDir, 'index.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ Error: Could not find index.html in the auto-rectanguler directory');
    process.exit(1);
  }
  
  try {
    // Determine the platform-specific command to open a browser
    const fileUrl = `file://${htmlPath}`;
    let command;
    
    switch (process.platform) {
      case 'darwin': // macOS
        command = `open "${htmlPath}"`;
        break;
      case 'win32': // Windows
        command = `start "" "${htmlPath}"`;
        break;
      default: // Linux and others
        command = `xdg-open "${htmlPath}"`;
    }
    
    execSync(command);
    console.log('✅ Auto Rectangle Detector launched successfully!');
  } catch (error) {
    console.error('❌ Error opening browser:', error.message);
  }
} else {
  // Otherwise, run npm start for react apps
  try {
    // Use spawn to run the npm start command in a new process
    const npmProcess = spawn('npm', ['start'], { 
      cwd: toolDir,
      shell: true,
      stdio: 'inherit',
      detached: true
    });
    
    npmProcess.on('error', (error) => {
      console.error('❌ Failed to start app:', error.message);
    });

    // Allow the parent process to exit independently
    npmProcess.unref();
    
    console.log(`✅ ${tool} launched successfully!`);
  } catch (error) {
    console.error('❌ Error launching app:', error.message);
  }
}