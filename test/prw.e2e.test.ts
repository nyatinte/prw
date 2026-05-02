import { resolve } from "node:path";

import { createFixture } from "fs-fixture";
import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";

import pkg from "../package.json" with { type: "json" };

const repoRoot = resolve(import.meta.dirname, "..");
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
    args: [binPath, ...args],
    cols: 100,
    command: "node",
    cwd,
    env: {
      HOME: homeDir,
      PATH: process.env.PATH,
    },
    rows: 30,
  });
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
  test("shows the script picker for simple workspace package selection", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["web"],
      cwd: resolve(repoRoot, "example/simple"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select script");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test.each(["build", "dev", "test", "type-check", "zzz"])(
    'shows the simple workspace script picker while searching for "%s"',
    async (query) => {
      await using fixture = await createFixture();
      const session = await launchPrwSession({
        args: ["web"],
        cwd: resolve(repoRoot, "example/simple"),
        homeDir: fixture.path,
      });

      try {
        await session.waitForText("Select script");
        await expect(
          getScriptSearchTerminalText(session, query)
        ).resolves.toMatchSnapshot();
      } finally {
        await closeSessionSafely(session);
      }
    }
  );

  test("runs a script directly in the simple workspace", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["web", "dev"],
      cwd: resolve(repoRoot, "example/simple"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("🚀 @simple/web dev starting...");

      await expect(readTerminal(session)).resolves.toContain(
        "🚀 @simple/web dev starting..."
      );
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("shows the package picker for the large workspace", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/large"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select package");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test.each(["web", "zzz"])(
    'shows the package picker while searching for "%s"',
    async (query) => {
      await using fixture = await createFixture();
      const session = await launchPrwSession({
        cwd: resolve(repoRoot, "example/large"),
        homeDir: fixture.path,
      });

      try {
        await session.waitForText("Select package");
        await expect(
          getPackageSearchTerminalText(session, query)
        ).resolves.toMatchSnapshot();
      } finally {
        await closeSessionSafely(session);
      }
    }
  );

  test('shows the filtered package picker for the query "a"', async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["a"],
      cwd: resolve(repoRoot, "example/large"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select package");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("shows the package picker cancellation state", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/large"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select package");

      await expect(cancelAndReadTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("runs a script directly in the large workspace", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["api", "build"],
      cwd: resolve(repoRoot, "example/large"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("📦 @large/api building...");

      await expect(readTerminal(session)).resolves.toContain(
        "📦 @large/api building..."
      );
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("shows the minimal script picker in edge-cases workspace", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["minimal"],
      cwd: resolve(repoRoot, "example/edge-cases"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select script");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test.each(["build", "zzz"])(
    'shows the minimal script picker while searching for "%s"',
    async (query) => {
      await using fixture = await createFixture();
      const session = await launchPrwSession({
        args: ["minimal"],
        cwd: resolve(repoRoot, "example/edge-cases"),
        homeDir: fixture.path,
      });

      try {
        await session.waitForText("Select script");
        await expect(
          getScriptSearchTerminalText(session, query)
        ).resolves.toMatchSnapshot();
      } finally {
        await closeSessionSafely(session);
      }
    }
  );

  test("shows the root script picker", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["root"],
      cwd: resolve(repoRoot, "example/simple"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select script");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("shows the script picker cancellation state", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["web"],
      cwd: resolve(repoRoot, "example/simple"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select script");

      await expect(cancelAndReadTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("reports a missing script list for unnamed packages", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["unnamed"],
      cwd: resolve(repoRoot, "example/edge-cases"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("No scripts in apps/unnamed");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
      await expect(readTerminal(session)).resolves.toContain(
        "No scripts in apps/unnamed"
      );
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("reports a missing script list for named packages with no scripts", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["no-scripts"],
      cwd: resolve(repoRoot, "example/edge-cases"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("No scripts in @edge/no-scripts");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
      await expect(readTerminal(session)).resolves.toContain(
        "No scripts in @edge/no-scripts"
      );
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("shows the package picker when launched from inside a workspace subdirectory", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      cwd: resolve(repoRoot, "example/simple/apps/web"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("Select package");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });

  test("runs root workspace scripts when launched from inside a workspace subdirectory", async () => {
    await using fixture = await createFixture();
    const session = await launchPrwSession({
      args: ["root", "build"],
      cwd: resolve(repoRoot, "example/simple/apps/web"),
      homeDir: fixture.path,
    });

    try {
      await session.waitForText("@simple/web building");

      const output = await readTerminal(session);

      expect(output).toContain("simple-workspace@1.0.0 build");
      expect(output).toContain("/example/simple");
      expect(output).toContain("@simple/web building");
    } finally {
      await closeSessionSafely(session);
    }
  });

  test.each(["--help", "-h"])(
    'shows help when "%s" is passed',
    async (flag) => {
      await using fixture = await createFixture();
      const session = await launchPrwSession({
        args: [flag],
        cwd: fixture.path,
        homeDir: fixture.path,
      });

      try {
        await session.waitForText("USAGE");

        expect(
          (await readTerminal(session)).replace(pkg.version, "0.0.0-test")
        ).toMatchSnapshot();
      } finally {
        await closeSessionSafely(session);
      }
    }
  );

  test.each(["--version", "-v"])(
    'shows version when "%s" is passed',
    async (flag) => {
      await using fixture = await createFixture();
      const session = await launchPrwSession({
        args: [flag],
        cwd: fixture.path,
        homeDir: fixture.path,
      });

      try {
        await session.waitForText(pkg.version);

        const output = await readTerminal(session);
        expect(output).toContain(pkg.version);
      } finally {
        await closeSessionSafely(session);
      }
    }
  );

  test("reports an error when launched completely outside a workspace", async () => {
    await using fixture = await createFixture();
    await using homeFixture = await createFixture();
    const session = await launchPrwSession({
      cwd: fixture.path,
      homeDir: homeFixture.path,
    });

    try {
      await session.waitForText("Run prw inside a pnpm workspace.");

      await expect(readTerminal(session)).resolves.toMatchSnapshot();
    } finally {
      await closeSessionSafely(session);
    }
  });
});
