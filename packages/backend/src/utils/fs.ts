import fs from 'fs';

export function safeUnlink(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err) console.warn(`[FileCleanup] Failed to delete ${filePath}:`, err.message);
  });
}
