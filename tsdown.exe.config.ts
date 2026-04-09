import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    bin: "src/bin.ts",
  },
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
