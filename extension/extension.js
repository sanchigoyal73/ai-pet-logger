const vscode = require('vscode');
const http = require('http');

let currentPanel = undefined;

function getWebviewContent(state) {
  // Simple CSS animation for the pixel cat sprite based on state
  const stateGifs = {
    idle: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnhhcm1lNWZkMHg1cGxqY2NsaDdxYXJ6NjRleDFveG9sOWx5cGp5eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VbnUQpnihPSIgIXuZv/giphy.gif', // Placeholder sleeping cat
    listening: 'https://media.giphy.com/media/Lp9hAYOADiRck/giphy.gif',
    thinking: 'https://media.giphy.com/media/Lp9hAYOADiRck/giphy.gif',
    logged: 'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif'
  };

  const currentGif = stateGifs[state] || stateGifs.idle;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                display: flex; 
                flex-direction: column;
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background-color: transparent; 
                color: var(--vscode-editor-foreground);
                font-family: var(--vscode-font-family);
            }
            img { width: 150px; image-rendering: pixelated; border-radius: 12px; }
            .status { margin-top: 15px; font-size: 1.2rem; font-weight: bold; }
        </style>
    </head>
    <body>
        <img src="${currentGif}" alt="Pet State" />
        <div class="status">State: ${state}</div>
    </body>
    </html>
  `;
}

function activate(context) {
  let server;

  let disposable = vscode.commands.registerCommand('aiPet.start', () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Beside);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'aiPet',
        'AI Pet',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      currentPanel.webview.html = getWebviewContent('idle');

      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      }, null, context.subscriptions);
    }

    // Start IPC Server for the node background process
    if (!server) {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const { state } = JSON.parse(body);
            if (currentPanel) {
              currentPanel.webview.html = getWebviewContent(state);
            }
          } catch (e) {}
          res.writeHead(200);
          res.end('OK');
        });
      });
      server.listen(34568, () => {
        console.log("AI Pet VS Code IPC listening on 34568");
      });
    }
  });

  context.subscriptions.push(disposable);
  
  context.subscriptions.push({
    dispose: () => {
      if (server) server.close();
    }
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
