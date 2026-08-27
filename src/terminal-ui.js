const React = require('react');
const { render, Text, Box } = require('ink');
const http = require('http');

const PetFace = () => {
  const [petState, setPetState] = React.useState('idle');

  React.useEffect(() => {
    // Start a tiny HTTP server to receive state updates from watch-qa.js
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const { state } = JSON.parse(body);
          if (state) setPetState(state);
        } catch (e) {}
        res.writeHead(200);
        res.end('OK');
      });
    });
    
    server.listen(34567, () => {
      // Listening for IPC on port 34567
    });

    return () => server.close();
  }, []);

  const faces = {
    idle: '( ^._.^ ) Zzz...',
    listening: '( O_O ) Listening...',
    thinking: '( -.- ) Hmm...',
    logged: '( ^▿^ ) Logged!'
  };

  const colors = {
    idle: 'gray',
    listening: 'cyan',
    thinking: 'yellow',
    logged: 'green'
  };

  return React.createElement(Box, { padding: 1, borderStyle: 'round', borderColor: colors[petState] || 'gray' },
    React.createElement(Text, { color: colors[petState] || 'gray', bold: true }, faces[petState] || faces.idle)
  );
};

console.clear();
render(React.createElement(PetFace));
