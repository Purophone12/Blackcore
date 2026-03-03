import { describe, it, expect } from 'vitest';
import { deriveGroupKey, encryptMessage, decryptMessage, generateSymmetricKey } from './crypto';

describe('Crypto Utilities', () => {
  it('should derive a consistent group key', async () => {
    const groupId = 'test-group-123';
    const key1 = await deriveGroupKey(groupId);
    const key2 = await deriveGroupKey(groupId);

    const message = 'Test consistency';
    const { ciphertext, iv } = await encryptMessage(message, key1);
    const decrypted = await decryptMessage(ciphertext, key2, iv);

    expect(decrypted).toBe(message);
  });

  it('should encrypt and decrypt a message', async () => {
    const message = 'Hello, Blackcore!';
    const key = await generateSymmetricKey();

    const { ciphertext, iv } = await encryptMessage(message, key);
    expect(ciphertext).toBeDefined();
    expect(iv).toBeDefined();

    const decrypted = await decryptMessage(ciphertext, key, iv);
    expect(decrypted).toBe(message);
  });

  it('should fail to decrypt with wrong key', async () => {
    const message = 'Secret Message';
    const key1 = await generateSymmetricKey();
    const key2 = await generateSymmetricKey();

    const { ciphertext, iv } = await encryptMessage(message, key1);

    await expect(decryptMessage(ciphertext, key2, iv)).rejects.toThrow();
  });

  it('should fail to decrypt with wrong IV', async () => {
    const message = 'Secret Message';
    const key = await generateSymmetricKey();

    const { ciphertext } = await encryptMessage(message, key);
    const wrongIv = new Uint8Array(12).fill(1);

    await expect(decryptMessage(ciphertext, key, wrongIv)).rejects.toThrow();
  });
});
