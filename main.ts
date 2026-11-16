// Emberwisp's hand-in program (Node 22, standard library only).
//
// The game itself is the static bundle in game/ — plain files a desktop
// browser opens offline. This program's whole job is to hand that bundle in:
// copy game/ and screenshots/ into the output directory, then write the
// dossier the judge reads, built by the kit's own library
// (vendor/makefun-game.ts) so the bytes match what the gate rebuilds.
//
// Run it locally the way the grader does, with MAKEFUN_OUTPUT_DIR naming
// the output directory instead of /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps below are the gate's own (see the kit's RULES.txt): the dossier
// text the judge reads, at most four screenshots of at most 256 KiB each,
// and a game tree of at most 993 entries, 48 MiB, and 1000-byte paths.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outputDir, GATE_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
