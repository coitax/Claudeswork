import type { StorageAdapter } from '@cbt/shared';
import { config } from '../config.js';
import { FileStorageAdapter } from './file-storage-adapter.js';

/**
 * Storage factory. Selects an adapter based on STORAGE_DRIVER.
 * v1 only ships the file adapter; sqlite is a stub (see *.stub.ts).
 */
export function createStorage(): StorageAdapter {
  switch (config.storageDriver) {
    case 'sqlite':
      throw new Error(
        'STORAGE_DRIVER=sqlite is not implemented yet. Use the default file driver.',
      );
    case 'file':
    default:
      return new FileStorageAdapter(config.dataDir);
  }
}

/** Singleton storage instance for the running server. */
export const storage: StorageAdapter = createStorage();
