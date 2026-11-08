import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const gitKb = process.env.GITKB_BIN || "git-kb";

async function runGitKb(args, options = {}) {
  const {
    kbRoot,
    requireStdout = true,
    setGitKbRoot = true
  } = options;
  const { stdout } = await execFileAsync(gitKb, args, {
    cwd: kbRoot,
    env: {
      ...process.env,
      ...(setGitKbRoot ? { GITKB_ROOT: kbRoot } : {})
    },
    maxBuffer: 1024 * 1024 * 20,
    timeout: 30_000
  });

  if (requireStdout && !stdout.trim()) {
    throw new Error(`Smoke command produced no output: ${gitKb} ${args.join(" ")}`);
  }

  return stdout;
}

async function createTemporaryKb() {
  const kbRoot = await mkdtemp(join(tmpdir(), "obsidian-gitkb-viewer-smoke-"));

  await runGitKb(["init", "--name", "GitKB Viewer Smoke Test", "--no-verify"], {
    kbRoot,
    requireStdout: false,
    setGitKbRoot: false
  });
  await runGitKb([
    "create",
    "note",
    "--slug",
    "smoke/root",
    "--title",
    "Smoke Root",
    "--body",
    "Root content links [[smoke/child]].",
    "--tags",
    "smoke",
    "--json"
  ], { kbRoot });
  await runGitKb([
    "create",
    "note",
    "--slug",
    "smoke/child",
    "--title",
    "Smoke Child",
    "--body",
    "Child content.",
    "--tags",
    "smoke",
    "--json"
  ], { kbRoot });
  await runGitKb(["commit", "-a", "-m", "Create smoke fixtures"], {
    kbRoot,
    requireStdout: false
  });

  return kbRoot;
}

function parseJson(output, command) {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Smoke command returned invalid JSON: ${command}\n${String(error)}`);
  }
}

function hasDocumentResultArray(value) {
  return Boolean(
    Array.isArray(value) ||
      (value &&
        typeof value === "object" &&
        (Array.isArray(value.documents) || Array.isArray(value.results)))
  );
}

async function runReadOnlySmoke(kbRoot) {
  await runGitKb(["--version"], { kbRoot });

  const listed = parseJson(await runGitKb(["list", "--json"], { kbRoot }), "list --json");
  // `list --json` is a page object; older git-kb prints a bare array.
  const docs = Array.isArray(listed) ? listed : listed?.documents;
  if (!Array.isArray(docs) || docs.length === 0 || typeof docs[0].slug !== "string") {
    throw new Error("Smoke list command did not return a document array with slugs.");
  }

  const rootSlug = docs.some((doc) => doc.slug === "smoke/root") ? "smoke/root" : docs[0].slug;
  const show = parseJson(await runGitKb(["show", rootSlug, "--json"], { kbRoot }), `show ${rootSlug} --json`);
  if (!Array.isArray(show.documents) || show.documents.length === 0) {
    throw new Error("Smoke show command did not return a document.");
  }

  const search = parseJson(await runGitKb(["search", "Smoke", "--json"], { kbRoot }), "search Smoke --json");
  if (!hasDocumentResultArray(search)) {
    throw new Error("Smoke search command did not return a recognized document result array.");
  }

  parseJson(await runGitKb(["board", "--json"], { kbRoot }), "board --json");
  parseJson(await runGitKb(["graph", rootSlug, "--json"], { kbRoot }), `graph ${rootSlug} --json`);
}

let temporaryKbRoot = null;
const kbRoot = process.env.GITKB_ROOT || (temporaryKbRoot = await createTemporaryKb());

try {
  await runReadOnlySmoke(kbRoot);
  console.log(`Smoke passed using read-only GitKB commands against ${kbRoot}`);
} finally {
  if (temporaryKbRoot) {
    await rm(temporaryKbRoot, { recursive: true, force: true });
  }
}
