#!/usr/bin/env node
/**
 * Compiles native/voca-type.c into a universal (arm64 + x86_64) binary at resources/bin/voca-type.
 * macOS only; the app falls back to clipboard paste when the binary is missing.
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

if (process.platform !== 'darwin') process.exit(0);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'native', 'voca-type.c');
const outDir = join(root, 'resources', 'bin');
const out = join(outDir, 'voca-type');

if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) process.exit(0);

mkdirSync(outDir, { recursive: true });
execFileSync('clang', [
  '-O2', '-arch', 'arm64', '-arch', 'x86_64', '-mmacosx-version-min=11.0',
  '-framework', 'ApplicationServices', '-framework', 'Carbon', '-framework', 'CoreFoundation',
  src, '-o', out,
], { stdio: 'inherit' });
console.log('  ✓ Built resources/bin/voca-type');
