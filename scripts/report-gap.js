#!/usr/bin/env node
/**
 * FHEVM Skill — Gap Reporter
 * Run: node scripts/report-gap.js
 *
 * Collects info about a skill failure and opens a pre-filled GitHub Issue.
 */

const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// Set via env var or falls back to package.json repository field
const pkgJson = (() => { try { return require("../package.json"); } catch { return {}; } })();
const REPO = process.env.SKILL_REPO
  || pkgJson.repository?.url?.match(/github\.com[/:](.+?)(?:\.git)?$/)?.[1]
  || "YOUR_GITHUB_USERNAME/fhevm-skill-demo";
const SKILL_PATH = path.join(__dirname, "../SKILL.md");

// Read current skill version
let skillVersion = "unknown";
try {
  const skill = fs.readFileSync(SKILL_PATH, "utf8");
  const match = skill.match(/\*\*Version\*\*\s*\|\s*([^\n|]+)/);
  if (match) skillVersion = match[1].trim();
} catch (_) {}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("\n=== FHEVM Skill Gap Reporter ===\n");
  console.log(`Skill version: ${skillVersion}\n`);

  const title     = await ask("Short title for the gap (e.g. 'Missing ACL after select'): ");
  const prompt    = await ask("What prompt did you give the AI agent? \n> ");
  const wrong     = await ask("What went wrong? (compile error / test failure / wrong behaviour): ");
  const error     = await ask("Error message (paste key line, or press Enter to skip): ");
  const section   = await ask("Which SKILL.md section needs updating? (e.g. 'Section 6 — ACL'): ");

  rl.close();

  // Try to get last test output
  let testOutput = "";
  try {
    testOutput = execSync("cd .. && pnpm test 2>&1", { encoding: "utf8", timeout: 60000 });
  } catch (e) {
    testOutput = e.stdout || e.message || "Could not capture test output";
  }

  const failLines = testOutput
    .split("\n")
    .filter((l) => l.match(/failing|Error|AssertionError/))
    .slice(0, 10)
    .join("\n");

  const body = encodeURIComponent(`
## Gap Report

**Skill version:** ${skillVersion}
**Section to update:** ${section}

### Prompt given to agent
> ${prompt}

### What went wrong
${wrong}

### Error message
\`\`\`
${error || "N/A"}
\`\`\`

### Relevant test failures
\`\`\`
${failLines || "N/A"}
\`\`\`

### Environment
- OS: ${process.platform}
- Node: ${process.version}
- Date: ${new Date().toISOString().slice(0, 10)}
`.trim());

  const encodedTitle = encodeURIComponent(`[Gap] ${title}`);
  const url = `https://github.com/${REPO}/issues/new?title=${encodedTitle}&body=${body}&labels=skill-gap`;

  console.log("\n✓ Opening GitHub Issue in your browser...");
  console.log(`  ${decodeURIComponent(url).slice(0, 80)}...\n`);

  // Open in browser cross-platform
  try {
    const open = process.platform === "win32" ? "start" :
                 process.platform === "darwin" ? "open" : "xdg-open";
    execSync(`${open} "${url}"`);
  } catch (_) {
    console.log("Could not open browser. Copy this URL manually:");
    console.log(`https://github.com/${REPO}/issues/new`);
  }
}

main().catch(console.error);
