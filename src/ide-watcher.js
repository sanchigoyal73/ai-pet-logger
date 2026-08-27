const { exec, spawn } = require('child_process');
const path = require('path');

// List of process names or paths that indicate an IDE is running
const IDE_PROCESS_KEYWORDS = [
  'Antigravity',
  'Cursor',
  'Code Helper', // VS Code
  'WebStorm',
  'IntelliJ IDEA',
  'Xcode'
];

let petProcess = null;

function checkIDEsRunning(callback) {
  // Use ps -ax to get all running processes
  exec('ps -ax -o command', (err, stdout) => {
    if (err) {
      console.error('Error fetching processes:', err);
      return callback(false);
    }
    
    // Check if any line in stdout matches one of our keywords
    const isRunning = IDE_PROCESS_KEYWORDS.some(keyword => {
      // Look for the keyword (case insensitive) in the process list
      const regex = new RegExp(keyword, 'i');
      return stdout.split('\n').some(line => regex.test(line));
    });

    callback(isRunning);
  });
}

function startPet() {
  if (petProcess) return;
  
  console.log('🐾 IDE detected! Starting AI pet...');
  const watchScriptPath = path.join(__dirname, 'watch-qa.js');
  
  petProcess = spawn(process.execPath, [watchScriptPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: path.dirname(__dirname) // Run from the project root
  });

  petProcess.on('close', (code) => {
    console.log(`🐾 Pet process exited with code ${code}`);
    petProcess = null;
  });
}

function stopPet() {
  if (!petProcess) return;
  
  console.log('🐾 No IDEs detected. Stopping AI pet...');
  petProcess.kill('SIGTERM');
  petProcess = null;
}

function poll() {
  checkIDEsRunning((isRunning) => {
    if (isRunning) {
      startPet();
    } else {
      stopPet();
    }
  });
}

// Poll every 5 seconds
setInterval(poll, 5000);
console.log('🐾 IDE Watcher started. Waiting for IDEs...');
poll(); // initial check
