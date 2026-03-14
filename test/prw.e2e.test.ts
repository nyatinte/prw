import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture } from "fs-fixture";
import { launchTerminal, type Session } from "tuistory";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = resolve(repoRoot, "dist/bin.mjs");

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

function launchPrwSession({
  cwd,
  homeDir,
  args = [],
}: {
  cwd: string;
  homeDir: string;
  args?: string[];
}): Promise<Session> {
  return launchTerminal({
    command: "node",
    args: [binPath, ...args],
    cwd,
    cols: 100,
    rows: 30,
    env: {
      HOME: homeDir,
      PATH: process.env.PATH,
    },
  });
}

async function withPrwSession(
  {
    cwd,
    args = [],
  }: {
    cwd: string;
    args?: string[];
  },
  run: (session: Session) => Promise<void>
): Promise<void> {
  await using fixture = await createFixture();
  const session = await launchPrwSession({
    cwd,
    args,
    homeDir: fixture.path,
  });

  try {
    await run(session);
  } finally {
    await closeSessionSafely(session);
  }
}

function readTerminal(session: Session): Promise<string> {
  return session.text({ trimEnd: true });
}

async function getPackageSearchTerminalText(
  session: Session,
  query: string
): Promise<string> {
  await session.type(query);
  await session.waitForText(`Search: ${query}`);
  return readTerminal(session);
}

async function getScriptSearchTerminalText(
  session: Session,
  query: string
): Promise<string> {
  await session.type(query);
  await session.waitForText(`Search: ${query}`);
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
  it("shows the script picker for simple workspace package selection", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple"),
        args: ["web"],
      },
      async (session) => {
        await session.waitForText("Select script");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it.each([
    "build",
    "dev",
    "test",
    "type-check",
    "zzz",
  ])('shows the simple workspace script picker while searching for "%s"', async (query) => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple"),
        args: ["web"],
      },
      async (session) => {
        await session.waitForText("Select script");
        expect(
          await getScriptSearchTerminalText(session, query)
        ).toMatchSnapshot();
      }
    );
  });

  it("runs a script directly in the simple workspace", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple"),
        args: ["web", "dev"],
      },
      async (session) => {
        await session.waitForText("🚀 @simple/web dev starting...");

        expect(await readTerminal(session)).toContain(
          "🚀 @simple/web dev starting..."
        );
      }
    );
  });

  it("shows the package picker for the large workspace", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/large"),
      },
      async (session) => {
        await session.waitForText("Select package");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it.each([
    "web",
    "zzz",
  ])('shows the package picker while searching for "%s"', async (query) => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/large"),
      },
      async (session) => {
        await session.waitForText("Select package");
        expect(
          await getPackageSearchTerminalText(session, query)
        ).toMatchSnapshot();
      }
    );
  });

  it('shows the filtered package picker for the query "a"', async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/large"),
        args: ["a"],
      },
      async (session) => {
        await session.waitForText("Select package");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it("shows the package picker cancellation state", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/large"),
      },
      async (session) => {
        await session.waitForText("Select package");

        expect(await cancelAndReadTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it("runs a script directly in the large workspace", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/large"),
        args: ["api", "build"],
      },
      async (session) => {
        await session.waitForText("📦 @large/api building...");

        expect(await readTerminal(session)).toContain(
          "📦 @large/api building..."
        );
      }
    );
  });

  it("shows the minimal script picker in edge-cases workspace", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/edge-cases"),
        args: ["minimal"],
      },
      async (session) => {
        await session.waitForText("Select script");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it.each([
    "build",
    "zzz",
  ])('shows the minimal script picker while searching for "%s"', async (query) => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/edge-cases"),
        args: ["minimal"],
      },
      async (session) => {
        await session.waitForText("Select script");
        expect(
          await getScriptSearchTerminalText(session, query)
        ).toMatchSnapshot();
      }
    );
  });

  it("shows the root script picker", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple"),
        args: ["root"],
      },
      async (session) => {
        await session.waitForText("Select script");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it("shows the script picker cancellation state", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple"),
        args: ["web"],
      },
      async (session) => {
        await session.waitForText("Select script");

        expect(await cancelAndReadTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it("reports a missing script list for unnamed packages", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/edge-cases"),
        args: ["unnamed"],
      },
      async (session) => {
        await session.waitForText("No scripts in apps/unnamed");

        expect(await readTerminal(session)).toMatchSnapshot();
        expect(await readTerminal(session)).toContain(
          "No scripts in apps/unnamed"
        );
      }
    );
  });

  it("reports a missing script list for named packages with no scripts", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/edge-cases"),
        args: ["no-scripts"],
      },
      async (session) => {
        await session.waitForText("No scripts in @edge/no-scripts");

        expect(await readTerminal(session)).toMatchSnapshot();
        expect(await readTerminal(session)).toContain(
          "No scripts in @edge/no-scripts"
        );
      }
    );
  });

  it("shows the package picker when launched from inside a workspace subdirectory", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple/apps/web"),
      },
      async (session) => {
        await session.waitForText("Select package");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });

  it("runs root workspace scripts when launched from inside a workspace subdirectory", async () => {
    await withPrwSession(
      {
        cwd: resolve(repoRoot, "example/simple/apps/web"),
        args: ["root", "build"],
      },
      async (session) => {
        await session.waitForText("@simple/web building");

        const output = await readTerminal(session);

        expect(output).toContain("simple-workspace@1.0.0 build");
        expect(output).toContain("/example/simple");
        expect(output).toContain("@simple/web building");
      }
    );
  });

  it("reports an error when launched completely outside a workspace", async () => {
    await using fixture = await createFixture();

    await withPrwSession(
      {
        cwd: fixture.path,
      },
      async (session) => {
        await session.waitForText("Run prw inside a pnpm workspace.");

        expect(await readTerminal(session)).toMatchSnapshot();
      }
    );
  });
});
