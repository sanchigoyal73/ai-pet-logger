const keychain = require('cross-keychain');

async function getSecret(key, envFallback) {
  try {
    const value = await keychain.getPassword('ai-pet-logger', key);
    if (value) return value;
  } catch (e) {
    // Keychain failed or not found, fallback to env
  }
  return process.env[envFallback] || null;
}

async function setSecret(key, value) {
  try {
    await keychain.setPassword('ai-pet-logger', key, value);
  } catch (e) {
    console.error(`Failed to save ${key} to keychain:`, e.message);
  }
}

module.exports = { getSecret, setSecret };
