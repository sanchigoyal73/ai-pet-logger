const { execFile, exec } = require('child_process');

function notify(title, message, emote = '🐾') {
  const platform = process.platform;
  const safeTitle = `${emote} ${title}`.replace(/"/g, '\\"');
  const safeMessage = message.replace(/"/g, '\\"');

  if (platform === 'darwin') {
    // Use execFile to bypass shell quoting rules. The single quote in "today's" breaks standard bash exec.
    execFile('osascript', ['-e', `display notification "${safeMessage}" with title "${safeTitle}"`], (err) => {
      if (err) console.error('Notification failed:', err.message);
    });
  } else if (platform === 'win32') {
    const psTitle = safeTitle.replace(/'/g, "''");
    const psMsg = safeMessage.replace(/'/g, "''");
    const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $notify = New-Object System.Windows.Forms.NotifyIcon; $notify.Icon = [System.Drawing.SystemIcons]::Information; $notify.BalloonTipIcon = 'Info'; $notify.BalloonTipTitle = '${psTitle}'; $notify.BalloonTipText = '${psMsg}'; $notify.Visible = $true; $notify.ShowBalloonTip(5000)"`;
    exec(command, () => {});
  } else {
    exec(`notify-send "${safeTitle}" "${safeMessage}"`, () => {});
  }
}

module.exports = { notify };
