const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PLIST_NAME = 'com.pawpaw.ai-pet-watcher.plist';
const LAUNCH_AGENT_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_PATH = path.join(LAUNCH_AGENT_DIR, PLIST_NAME);

// Ensure the directory exists
if (!fs.existsSync(LAUNCH_AGENT_DIR)) {
  fs.mkdirSync(LAUNCH_AGENT_DIR, { recursive: true });
}

// Path to Node and the Watcher Script
const nodePath = process.execPath;
const watcherPath = path.join(__dirname, 'ide-watcher.js');
const workingDirectory = path.dirname(__dirname); // project root
const logsDirectory = path.join(workingDirectory, 'logs');

if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory);
}

const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pawpaw.ai-pet-watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${watcherPath}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${workingDirectory}</string>
    <key>StandardOutPath</key>
    <string>${path.join(logsDirectory, 'watcher.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(logsDirectory, 'watcher-error.log')}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
`;

// Write the plist file
fs.writeFileSync(PLIST_PATH, plistContent);
console.log(`🐾 Created LaunchAgent plist at ${PLIST_PATH}`);

// Load it via launchctl
try {
  // First unload if it exists
  try {
    execSync(`launchctl unload ${PLIST_PATH}`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore error if it wasn't loaded
  }
  
  execSync(`launchctl load ${PLIST_PATH}`, { stdio: 'inherit' });
  console.log('🐾 Successfully loaded LaunchAgent. The IDE watcher is now running in the background!');
  console.log(`🐾 Logs can be found at ${logsDirectory}`);
} catch (error) {
  console.error('Failed to load LaunchAgent:', error.message);
}
