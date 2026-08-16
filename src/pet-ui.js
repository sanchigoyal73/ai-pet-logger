const { exec } = require('child_process');

function notify(title, message, emote = '🐾') {
  const platform = process.platform;
  const safeTitle = `${emote} ${title}`.replace(/"/g, '\\"');
  const safeMessage = message.replace(/"/g, '\\"');

  let command;
  if (platform === 'darwin') {
    command = `osascript -e 'display notification "${safeMessage}" with title "${safeTitle}"'`;
  } else if (platform === 'win32') {
    // Escape single quotes for PowerShell
    const psTitle = safeTitle.replace(/'/g, "''");
    const psMsg = safeMessage.replace(/'/g, "''");
    command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $notify = New-Object System.Windows.Forms.NotifyIcon; $notify.Icon = [System.Drawing.SystemIcons]::Information; $notify.BalloonTipIcon = 'Info'; $notify.BalloonTipTitle = '${psTitle}'; $notify.BalloonTipText = '${psMsg}'; $notify.Visible = $true; $notify.ShowBalloonTip(5000)"`;
  } else {
    // Linux / other
    command = `notify-send "${safeTitle}" "${safeMessage}"`;
  }

  exec(command, (err) => {
    if (err) {
      // Just log silently, don't crash if notifications fail
      // console.error('Failed to show notification:', err.message);
    }
  });
}

module.exports = { notify };
