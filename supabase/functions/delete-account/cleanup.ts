export interface OwnedFile { bucket: string; path: string }
export interface DeletionOperations {
  listFiles: () => Promise<OwnedFile[]>;
  removeFiles: (bucket: string, paths: string[]) => Promise<{ name: string }[]>;
  deleteData: () => Promise<void>;
  deleteUser: () => Promise<void>;
}

export function canConfirmDeletion(value: string): boolean {
  return value === 'DELETE';
}

// This order is intentional: never remove rows or auth if Storage reports a failure.
export async function deleteAccountSteps(operations: DeletionOperations) {
  const files = await operations.listFiles();
  const buckets = new Map<string, Set<string>>();
  for (const file of files) {
    const paths = buckets.get(file.bucket) ?? new Set<string>();
    paths.add(file.path);
    buckets.set(file.bucket, paths);
  }
  for (const [bucket, paths] of buckets) {
    const all = [...paths];
    for (let offset = 0; offset < all.length; offset += 100) {
      const batch = all.slice(offset, offset + 100);
      const deleted = await operations.removeFiles(bucket, batch);
      const returned = new Set(deleted.map(file => file.name));
      if (batch.some(path => !returned.has(path))) {
        throw new Error('Storage did not confirm every file deletion. Your account has not been deleted. Some files may already have been removed.');
      }
    }
  }
  await operations.deleteData();
  await operations.deleteUser();
}