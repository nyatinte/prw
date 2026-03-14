import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchTerminal, type Session } from "tuistory";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = resolve(repoRoot, "dist/bin.mjs");
const E2E_WAIT_TIMEOUT = 1500;

/*
Use this file for end-to-end tests that validate the real interactive terminal
experience of `prw` against the example workspaces.

Add a test here when the behavior is primarily expressed through the TUI itself,
especially when a user must read a screen and make a choice based on what is
rendered. Good candidates include package pickers, script pickers, fallback
package names, and other states where the visible menu contents are part of the
product contract.

Prefer snapshots for "meaningful screen states":
- a package picker that should show a specific set of workspace packages
- a script picker that should show the available scripts in the expected shape
- an edge-case screen where fallback labels such as `apps/unnamed` are the
  behavior we want to preserve

Prefer regular assertions for outcomes rather than screen shape:
- a script was executed and printed the expected output
- a command failed with "No scripts in ..."
- direct execution mode ran the intended package/script pair

Examples:
- `prw web` in `example/simple` should snapshot the script picker UI
- `prw` in `example/large` should snapshot the package picker UI
- `prw unnamed` in `example/edge-cases` should preserve the fallback package
  name in the rendered output, so snapshot the screen and also assert the error
  message

Do not add every CLI branch here. Pure logic such as workspace parsing, sorting,
history handling, and runner behavior should stay in unit tests unless the real
terminal rendering is the thing under test.
*/

function createIsolatedHome(): string {
  return mkdtempSync(join(tmpdir(), "prw-tuistory-"));
}

function createOutsideWorkspaceDir(): string {
  return mkdtempSync(join(tmpdir(), "prw-outside-"));
}

function launchPrwSession({
  cwd,
  args = [],
}: {
  cwd: string;
  args?: string[];
}): Promise<Session> {
  return launchTerminal({
    command: "node",
    args: [binPath, ...args],
    cwd,
    cols: 100,
    rows: 30,
    env: {
      ...process.env,
      HOME: createIsolatedHome(),
    },
  });
}

function readTerminal(session: Session): Promise<string> {
  return session.text({ trimEnd: true });
}

async function waitForPackagePicker(session: Session): Promise<void> {
  await session.waitForText("Select package", { timeout: E2E_WAIT_TIMEOUT });
}

async function waitForScriptPicker(session: Session): Promise<void> {
  await session.waitForText("Select script", { timeout: E2E_WAIT_TIMEOUT });
}

async function getPackageSearchTerminalText(
  session: Session,
  query: string
): Promise<string> {
  await session.type(query);
  await session.waitForText(`Search: ${query}`, { timeout: E2E_WAIT_TIMEOUT });
  return readTerminal(session);
}

async function getScriptSearchTerminalText(
  session: Session,
  query: string
): Promise<string> {
  await session.type(query);
  await session.waitForText(`Search: ${query}`, { timeout: E2E_WAIT_TIMEOUT });
  return readTerminal(session);
}

async function cancelAndReadTerminal(session: Session): Promise<string> {
  await session.press("esc");
  await new Promise((resolve) => setTimeout(resolve, 250));
  return readTerminal(session);
}

function closeSessionSafely(session: Session | undefined): Promise<void> {
  if (!session) {
    return Promise.resolve();
  }

  try {
    session.close();
  } catch {
    // Ignore cleanup failures so test errors stay focused on the terminal state.
  }

  return Promise.resolve();
}

describe.sequential("prw e2e", () => {
  let session: Session | undefined;
  let outsideWorkspaceDir: string | undefined;

  afterEach(async () => {
    await closeSessionSafely(session);
    session = undefined;
    if (outsideWorkspaceDir) {
      rmSync(outsideWorkspaceDir, { recursive: true, force: true });
      outsideWorkspaceDir = undefined;
    }
  });

  it("shows the script picker for simple workspace package selection", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple"),
      args: ["web"],
    });

    await waitForScriptPicker(session);

    expect(await readTerminal(session)).toMatchSnapshot();
  });

  for (const query of ["build", "dev", "test", "type-check", "zzz"]) {
    it(`shows the simple workspace script picker while searching for "${query}"`, async () => {
      session = await launchPrwSession({
        cwd: resolve(repoRoot, "example/simple"),
        args: ["web"],
      });

      await waitForScriptPicker(session);
      expect(
        await getScriptSearchTerminalText(session, query)
      ).toMatchSnapshot();
    });
  }

  it("runs a script directly in the simple workspace", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple"),
      args: ["web", "dev"],
    });

    await session.waitForText("🚀 @simple/web dev starting...", {
      timeout: E2E_WAIT_TIMEOUT,
    });

    expect(await readTerminal(session)).toContain(
      "🚀 @simple/web dev starting..."
    );
  });

  it("shows the package picker for the large workspace", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/large"),
    });

    await waitForPackagePicker(session);

    expect(await readTerminal(session)).toMatchSnapshot();
  });

  for (const query of ["web", "zzz"]) {
    it(`shows the package picker while searching for "${query}"`, async () => {
      session = await launchPrwSession({
        cwd: resolve(repoRoot, "example/large"),
      });

      await waitForPackagePicker(session);
      expect(
        await getPackageSearchTerminalText(session, query)
      ).toMatchSnapshot();
    });
  }

  it('shows the filtered package picker for the query "a"', async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/large"),
      args: ["a"],
    });

    await waitForPackagePicker(session);

    expect(await readTerminal(session)).toMatchSnapshot();
  });

  it("shows the package picker cancellation state", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/large"),
    });

    await waitForPackagePicker(session);

    expect(await cancelAndReadTerminal(session)).toMatchSnapshot();
  });

  it("runs a script directly in the large workspace", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/large"),
      args: ["api", "build"],
    });

    await session.waitForText("📦 @large/api building...", {
      timeout: E2E_WAIT_TIMEOUT,
    });

    expect(await readTerminal(session)).toContain("📦 @large/api building...");
  });

  it("shows the minimal script picker in edge-cases workspace", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/edge-cases"),
      args: ["minimal"],
    });

    await waitForScriptPicker(session);

    expect(await readTerminal(session)).toMatchSnapshot();
  });

  for (const query of ["build", "zzz"]) {
    it(`shows the minimal script picker while searching for "${query}"`, async () => {
      session = await launchPrwSession({
        cwd: resolve(repoRoot, "example/edge-cases"),
        args: ["minimal"],
      });

      await waitForScriptPicker(session);
      expect(
        await getScriptSearchTerminalText(session, query)
      ).toMatchSnapshot();
    });
  }

  it("shows the root script picker", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple"),
      args: ["root"],
    });

    await waitForScriptPicker(session);

    expect(await readTerminal(session)).toMatchSnapshot();
  });

  it("shows the script picker cancellation state", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple"),
      args: ["web"],
    });

    await waitForScriptPicker(session);

    expect(await cancelAndReadTerminal(session)).toMatchSnapshot();
  });

  it("reports a missing script list for unnamed packages", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/edge-cases"),
      args: ["unnamed"],
    });

    await session.waitForText("No scripts in apps/unnamed", {
      timeout: E2E_WAIT_TIMEOUT,
    });

    expect(await readTerminal(session)).toMatchSnapshot();
    expect(await readTerminal(session)).toContain("No scripts in apps/unnamed");
  });

  it("reports a missing script list for named packages with no scripts", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/edge-cases"),
      args: ["no-scripts"],
    });

    await session.waitForText("No scripts in @edge/no-scripts", {
      timeout: E2E_WAIT_TIMEOUT,
    });

    expect(await readTerminal(session)).toMatchSnapshot();
    expect(await readTerminal(session)).toContain(
      "No scripts in @edge/no-scripts"
    );
  });

  it("shows the package picker when launched from inside a workspace subdirectory", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple/apps/web"),
    });

    await waitForPackagePicker(session);

    expect(await readTerminal(session)).toMatchSnapshot();
  });

  it("runs root workspace scripts when launched from inside a workspace subdirectory", async () => {
    session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple/apps/web"),
      args: ["root", "build"],
    });

    await session.waitForText("@simple/web building", {
      timeout: E2E_WAIT_TIMEOUT,
    });

    const output = await readTerminal(session);

    expect(output).toContain("simple-workspace@1.0.0 build");
    expect(output).toContain("/example/simple");
    expect(output).toContain("@simple/web building");
  });

  it("reports an error when launched completely outside a workspace", async () => {
    outsideWorkspaceDir = createOutsideWorkspaceDir();
    session = await launchPrwSession({
      cwd: outsideWorkspaceDir,
    });

    await session.waitForText("Run prw inside a pnpm workspace.", {
      timeout: E2E_WAIT_TIMEOUT,
    });

    expect(await readTerminal(session)).toMatchSnapshot();
  });
});
