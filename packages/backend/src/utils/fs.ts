import fs from 'fs';
import { logger } from '~/config/logger';

export function safeUnlink(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err) logger.warn('FileCleanup', `Failed to delete ${filePath}: ${err.message}`);
  });
}
