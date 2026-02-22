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
import { existsSync } from 'fs';

if (process.platform !== 'darwin') process.exit(0);

const require = createRequire(import.meta.url);

let electronBinary;
try {
  electronBinary = require('electron');
} catch {
  console.error('electron package not found, skipping plist patch');
  process.exit(0);
}

const plistPath = join(dirname(electronBinary), '..', 'Info.plist');

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
