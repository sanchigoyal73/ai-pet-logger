const http = require('http');

function broadcastState(state) {
  const payload = JSON.stringify({ state });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  // Broadcast to Terminal UI (Ink)
  const reqTerminal = http.request({ ...options, port: 34567, hostname: 'localhost' });
  reqTerminal.on('error', () => {}); // Ignore if UI isn't running
  reqTerminal.write(payload);
  reqTerminal.end();

  // Broadcast to VS Code Extension
  const reqVSCode = http.request({ ...options, port: 34568, hostname: 'localhost' });
  reqVSCode.on('error', () => {}); // Ignore if extension isn't running
  reqVSCode.write(payload);
  reqVSCode.end();
}

module.exports = { broadcastState };
