#!/usr/bin/env node
import { isCancel } from '@clack/prompts';
import { findWorkspaceRoot, getPackages } from './workspace';
import { loadHistory, saveHistory } from './history';
import { selectPackage, selectScript, sortPackages, sortScripts } from './ui';
import { runScript } from './runner';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  try {
    const root = findWorkspaceRoot(process.cwd());
    const packages = await getPackages(root);
    const history = loadHistory();

    let pkg = packages[0];
    let script = '';

    // Parse CLI arguments
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // Interactive: select package, then script
      const selected = await selectPackage(packages, history);
      if (isCancel(selected)) {
        console.log('Cancelled.');
        process.exit(0);
      }
      pkg = selected as typeof packages[0];
    } else if (args.length === 1) {
      // prw <package>: fuzzy match and select
      const query = args[0];
      const matches = packages.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      if (matches.length === 0) {
        console.error(`No packages match: ${query}`);
        process.exit(1);
      } else if (matches.length === 1) {
        pkg = matches[0];
      } else {
        const selected = await selectPackage(matches, history);
        if (isCancel(selected)) {
          console.log('Cancelled.');
          process.exit(0);
        }
        pkg = selected as typeof packages[0];
      }
    } else if (args.length >= 2) {
      // prw <package> <script>: direct execution
      const query = args[0];
      const matches = packages.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      if (matches.length === 0) {
        console.error(`No packages match: ${query}`);
        process.exit(1);
      } else if (matches.length === 1) {
        pkg = matches[0];
      } else {
        console.error(`Multiple packages match: ${query}. Be more specific.`);
        process.exit(1);
      }

      script = args[1];
    }

    // Select script if not provided
    if (!script) {
      const pkgJsonPath = join(root, pkg.dir, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      const scripts = Object.keys(pkgJson.scripts || {});

      if (scripts.length === 0) {
        console.error(`No scripts in ${pkg.name}`);
        process.exit(1);
      }

      const sorted = sortScripts(scripts, pkg.name, history);
      const selected = await selectScript(pkg, sorted, history);
      if (isCancel(selected)) {
        console.log('Cancelled.');
        process.exit(0);
      }
      script = selected;
    }

    // Run script and save history
    saveHistory({
      package: pkg.name,
      script,
      timestamp: Date.now(),
    });

    runScript(pkg, script);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

main();
