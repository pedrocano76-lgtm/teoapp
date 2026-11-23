import { describe, expect, it, vi } from 'vitest';
import { canConfirmDeletion, deleteAccountSteps, type DeletionOperations } from '../../supabase/functions/delete-account/cleanup';

function setup(): DeletionOperations {
  return {
    listFiles: vi.fn().mockResolvedValue([
      { bucket: 'photos', path: 'owner/child/original.jpg' },
      { bucket: 'photos', path: 'owner/child/thumbs/original.jpg' },
    ]),
    removeFiles: vi.fn(async (_bucket, paths) => paths.map(name => ({ name }))),
    deleteData: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
  };
}

describe('permanent account deletion', () => {
  it('requires the exact DELETE confirmation', () => {
    expect(canConfirmDeletion('DELETE')).toBe(true);
    for (const value of ['', 'delete', 'DELETE ', 'REMOVE']) expect(canConfirmDeletion(value)).toBe(false);
  });
  it('removes originals and thumbnails before data and auth', async () => {
    const ops = setup();
    await deleteAccountSteps(ops);
    expect(ops.removeFiles).toHaveBeenCalledWith('photos', ['owner/child/original.jpg', 'owner/child/thumbs/original.jpg']);
    expect(vi.mocked(ops.removeFiles).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ops.deleteData).mock.invocationCallOrder[0]);
    expect(vi.mocked(ops.deleteData).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ops.deleteUser).mock.invocationCallOrder[0]);
  });
  it('treats silent empty Storage deletions as errors and keeps auth', async () => {
    const ops = setup();
    vi.mocked(ops.removeFiles).mockResolvedValue([]);
    await expect(deleteAccountSteps(ops)).rejects.toThrow('Storage did not confirm');
    expect(ops.deleteData).not.toHaveBeenCalled();
    expect(ops.deleteUser).not.toHaveBeenCalled();
  });
  it('stops when one thumbnail is not confirmed', async () => {
    const ops = setup();
    vi.mocked(ops.removeFiles).mockResolvedValue([{ name: 'owner/child/original.jpg' }]);
    await expect(deleteAccountSteps(ops)).rejects.toThrow();
    expect(ops.deleteUser).not.toHaveBeenCalled();
  });
  it('stops on database failure without deleting auth', async () => {
    const ops = setup();
    vi.mocked(ops.deleteData).mockRejectedValue(new Error('Database failure'));
    await expect(deleteAccountSteps(ops)).rejects.toThrow('Database failure');
    expect(ops.deleteUser).not.toHaveBeenCalled();
  });
  it('does not delete any shared files when no owned files exist', async () => {
    const ops = setup();
    vi.mocked(ops.listFiles).mockResolvedValue([]);
    await deleteAccountSteps(ops);
    expect(ops.removeFiles).not.toHaveBeenCalled();
    expect(ops.deleteUser).toHaveBeenCalledOnce();
  });
  it('stops on file inspection errors', async () => {
    const ops = setup();
    vi.mocked(ops.listFiles).mockRejectedValue(new Error('Inspection failed'));
    await expect(deleteAccountSteps(ops)).rejects.toThrow('Inspection failed');
    expect(ops.deleteUser).not.toHaveBeenCalled();
  });
});