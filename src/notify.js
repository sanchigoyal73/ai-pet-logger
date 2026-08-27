const notifier = require('node-notifier');
const path = require('path');

const CAT_IMAGE = path.join(__dirname, '..', 'assets', 'cat.jpg');

function notifyState(state) {
  let message = '';
  let title = 'AI Pet Logger';

  switch (state) {
    case 'thinking':
      message = 'Thinking and processing your request... 🐾';
      title = 'AI Pet (Thinking)';
      break;
    case 'logged':
      message = 'Successfully logged to Notion! ✅';
      title = 'AI Pet (Logged)';
      break;
    case 'idle':
      // We generally don't notify when going back to idle to avoid spam,
      // but we leave this here just in case.
      return;
    default:
      return;
  }

  notifier.notify({
    title: title,
    message: message,
    icon: CAT_IMAGE, // Supported on macOS, Windows, Linux
    contentImage: CAT_IMAGE, // Used on macOS for larger image
    sound: true, // Play system sound
    wait: false
  });
}

module.exports = { notifyState };
