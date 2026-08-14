// src/sanitize.js
// Local, deterministic secret scanner. Runs BEFORE anything touches
// an LLM or leaves the machine. No AI involved, on purpose.

const SECRET_PATTERNS = [
  { name: "generic_api_key", re: /\b(?:api[_-]?key|apikey)\b\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}['"]?/gi },
  { name: "bearer_token", re: /\bBearer\s+[A-Za-z0-9._\-]{20,}/gi },
  { name: "aws_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "generic_secret", re: /\b(?:secret|token|password|passwd|pwd)\b\s*[:=]\s*['"]?[^\s'"]{6,}['"]?/gi },
  { name: "private_key_block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: "dotenv_mention", re: /\.env\b/g },
  { name: "high_entropy_blob", re: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g },
];

function sanitize(text) {
  if (!text) return { clean: text, blocked: false, hits: [] };
  const hits = [];
  for (const { name, re } of SECRET_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) hits.push(name);
  }
  return { clean: text, blocked: hits.length > 0, hits };
}

module.exports = { sanitize };
