// Leonida Legend — the entry program for gta6-trophy-guide-01.
//
// What it does: it hands the guide in. The guide itself is plain static
// files in app/ (index.html, app.js, style.css, data/trophies.json), built
// to run offline from its own folder with no build step. This program copies
// app/ and screenshots/ next to this file into the output directory and
// writes output/dossier.json with the kit's vendored library
// (vendor/makefun-frontend.ts), which is the summary the judge reads: the
// screenshots, the first load's files and bytes, and the source.
//
// It runs on Node 22 with the standard library only, in a container with no
// network, a read-only copy of the repository and a writable output folder.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The dossier library is the kit's copy and must stay byte-for-byte as
// shipped: the scorer rebuilds the dossier with its own copy and compares.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the folder this file sits in; the output folder is
// /output in the grader, or MAKEFUN_OUTPUT_DIR when run by hand.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countScreenshots(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => statSync(join(dir, name)).isFile());
}

function handInGuide(): void {
  const screenshots = countScreenshots(join(repoRoot, 'screenshots'));
  if (screenshots.length < 3 || screenshots.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${screenshots.length}`);
  }
  // Fail loudly here, with a readable message, rather than handing the
  // scorer an output folder with no guide in it.
  if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
    throw new Error('app/index.html is missing: nothing to hand in');
  }
  if (!existsSync(join(repoRoot, 'app', 'data', 'trophies.json'))) {
    throw new Error('app/data/trophies.json is missing: the guide has no trophy list');
  }

  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

  // The caps below are the scorer's own (see the kit's RULES.txt, "The gate"):
  // at most 4 screenshots of 256 KiB each, app/ at most 993 files and
  // directories and 48 MiB in all, and the dossier text at most 160 KiB.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`handed in ${screenshots.length} screenshots, dossier ${dossier.length} bytes`);
}

handInGuide();
