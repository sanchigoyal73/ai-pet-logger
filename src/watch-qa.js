require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { loadState, saveState } = require('./state');
const { notifyState } = require('./notify');

const brainDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');
let state = loadState();
let filePositions = state.filePositions || {};

let pendingQuestion = null;

function scanFiles() {
  if (!fs.existsSync(brainDir)) return [];
  const files = [];
  const convDirs = fs.readdirSync(brainDir);
  for (const convDir of convDirs) {
    // Only check directories
    const fullPath = path.join(brainDir, convDir);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    
    const logPath = path.join(fullPath, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(logPath)) {
      files.push(logPath);
    }
  }
  return files;
}

function poll() {
  const files = scanFiles();
  for (const file of files) {
    const stat = fs.statSync(file);
    if (filePositions[file] === undefined) {
      // First time seeing this file, skip existing content and start at the end
      filePositions[file] = stat.size;
    } else if (stat.size > filePositions[file]) {
      // File grew, read the new data
      const fd = fs.openSync(file, 'r');
      const buffer = Buffer.alloc(stat.size - filePositions[file]);
      fs.readSync(fd, buffer, 0, buffer.length, filePositions[file]);
      fs.closeSync(fd);
      
      filePositions[file] = stat.size;
      state.filePositions = filePositions;
      saveState(state);
      
      const newContent = buffer.toString('utf8');
      
      const lines = newContent.split('\n').filter(l => l.trim() !== '');
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          handleEntry(entry);
        } catch(e) {
          // Ignore partial or unparseable JSON lines
        }
      }
    }
  }
}

function handleEntry(entry) {
  if (entry.type === 'USER_INPUT') {
    let text = entry.content;
    const match = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
    if (match) {
      text = match[1].trim();
    }
    notifyState('thinking');
    pendingQuestion = text;
  } else if (entry.type === 'PLANNER_RESPONSE' && pendingQuestion) {
    const answer = entry.content;
    const question = pendingQuestion;
    pendingQuestion = null;
    
    console.log(`🐾 Detected Q&A match. Logging to Notion...`);
    const child = spawn(process.argv[0], [path.join(__dirname, 'log-qa.js'), question, answer], {
      stdio: 'inherit',
      env: process.env // Ensure .env variables are passed down
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        notifyState('logged');
      }
    });
  }
}

// Initial scan
scanFiles().forEach(file => {
  if (filePositions[file] === undefined) {
    filePositions[file] = fs.statSync(file).size;
  }
});
state.filePositions = filePositions;
saveState(state);

setInterval(poll, 2000);
console.log(`🐾 Watcher active. Listening for CLI conversations in ${brainDir}...`);
