// Lints only source files changed vs the base branch (default: staging), including uncommitted and untracked files.
// Usage: node scripts/lint-changed.js [baseBranch]
const { execSync, spawnSync } = require("child_process");

const base = process.argv[2] || "staging";
const run = (cmd) => execSync(cmd, { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);

const changed = new Set([
  ...run(`git diff --name-only --diff-filter=d ${base}`),
  ...run("git ls-files --others --exclude-standard"),
]);
const files = [...changed].filter((f) => /^src\/.*\.(js|jsx)$/.test(f));

if (files.length === 0) {
  console.log(`No changed source files vs ${base}.`);
  process.exit(0);
}

console.log(`Linting ${files.length} file(s) changed vs ${base}`);
const result = spawnSync("npx", ["eslint", "--quiet", ...files], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status === null ? 1 : result.status);
