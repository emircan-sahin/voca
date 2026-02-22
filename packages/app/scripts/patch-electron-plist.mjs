#!/usr/bin/env node
/**
 * Patches the Electron binary's Info.plist for development mode.
 * - Sets app name to "Voca" (so it shows correctly in System Preferences)
 * - Ensures NSMicrophoneUsageDescription is set
 * - Adds NSAccessibilityUsageDescription
 */

import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { existsSync, renameSync, writeFileSync, readFileSync } from 'fs';

if (process.platform !== 'darwin') process.exit(0);

const require = createRequire(import.meta.url);

const electronPkgDir = dirname(require.resolve('electron/package.json'));
const distDir = join(electronPkgDir, 'dist');
const pathTxtFile = join(electronPkgDir, 'path.txt');

const oldApp = join(distDir, 'Electron.app');
const newApp = join(distDir, 'Voca.app');

// Rename Electron.app → Voca.app so macOS Dock shows "Voca"
if (existsSync(oldApp)) {
  renameSync(oldApp, newApp);
  writeFileSync(pathTxtFile, 'Voca.app/Contents/MacOS/Electron');
  console.log('  ✓ Renamed Electron.app → Voca.app');
} else if (!existsSync(newApp)) {
  console.error('Neither Electron.app nor Voca.app found in', distDir);
  process.exit(1);
} else {
  // Already renamed from a previous run — ensure path.txt is correct
  const current = readFileSync(pathTxtFile, 'utf-8').trim();
  if (!current.startsWith('Voca.app')) {
    writeFileSync(pathTxtFile, 'Voca.app/Contents/MacOS/Electron');
  }
  console.log('  ✓ Voca.app already exists');
}

const plistPath = join(newApp, 'Contents', 'Info.plist');

if (!existsSync(plistPath)) {
  console.error('Info.plist not found at', plistPath);
  process.exit(1);
}

const buddy = '/usr/libexec/PlistBuddy';

function set(key, value) {
  try {
    execFileSync(buddy, ['-c', `Add :${key} string ${value}`, plistPath]);
  } catch {
    // Key already exists — update it
    execFileSync(buddy, ['-c', `Set :${key} ${value}`, plistPath]);
  }
  console.log(`  ✓ ${key}`);
}

console.log('Patching Electron Info.plist...');
set('CFBundleName', 'Voca');
set('CFBundleDisplayName', 'Voca');
set('NSMicrophoneUsageDescription', 'Voca needs microphone access to record audio.');
set('NSAccessibilityUsageDescription', 'Voca needs accessibility access to auto-paste transcripts.');
console.log('Done.');
