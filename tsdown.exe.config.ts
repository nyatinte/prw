import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    bin: "src/bin.ts",
  },
  // Without `targets`, exe: true builds only for the current platform using
  // the current Node.js binary. Specifying targets here enables cross-platform
  // builds: @tsdown/exe downloads the appropriate Node.js binary per target.
  exe: {
    outDir: "exe",
    fileName: "prw",
    targets: [
      { platform: "linux", arch: "x64", nodeVersion: "latest-lts" },
      { platform: "linux", arch: "arm64", nodeVersion: "latest-lts" },
      { platform: "darwin", arch: "x64", nodeVersion: "latest-lts" },
      { platform: "darwin", arch: "arm64", nodeVersion: "latest-lts" },
      { platform: "win", arch: "x64", nodeVersion: "latest-lts" },
    ],
  },
});
