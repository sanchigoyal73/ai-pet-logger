const fs = require('fs');
const path = require('path');
const os = require('os');

const targetRepo = process.argv[2] || process.cwd();
const hooksDir = path.join(targetRepo, '.git', 'hooks');

if (!fs.existsSync(hooksDir)) {
  console.error(`Error: No .git/hooks directory found in ${targetRepo}`);
  process.exit(1);
}

const hookPath = path.join(hooksDir, 'post-commit');
const logGitScript = path.join(__dirname, 'log-git.js');

const hookContent = `#!/bin/bash
# AI Pet Logger - Post Commit Hook
# Triggers log-git.js in the background without blocking the commit
nohup ${process.argv[0]} ${logGitScript} > /dev/null 2>&1 &
`;

fs.writeFileSync(hookPath, hookContent);
fs.chmodSync(hookPath, '755');
console.log(`🐾 Successfully installed post-commit hook in ${targetRepo}`);
