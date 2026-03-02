/**
 * E2EE Utilities using Web Crypto API
 */

const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return crypto;
};

// Generate an RSA key pair for asymmetric encryption (simulating user identity)
export async function generateKeyPair() {
  const c = getCrypto();
  return await c.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Generate a symmetric key for AES-GCM (group chat messages)
export async function generateSymmetricKey() {
  const c = getCrypto();
  return await c.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive a group-specific symmetric key from a groupId and a master secret.
 * In a real app, the master secret would be shared among members securely.
 * For this demo, we use a fixed master secret and the groupId.
 */
export async function deriveGroupKey(groupId) {
  const c = getCrypto();
  const appSecret = "blackcore-social-v1-shared-key-32b";
  const encoder = new TextEncoder();
  const baseData = encoder.encode(appSecret + groupId);

  // Hash the combination to get a fixed-length 256-bit key
  const hash = await c.subtle.digest("SHA-256", baseData);

  return await c.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message using AES-GCM
export async function encryptMessage(message, key) {
  const c = getCrypto();
  const enc = new TextEncoder();
  const encodedMessage = enc.encode(message);
  const iv = c.getRandomValues(new Uint8Array(12));

  const ciphertext = await c.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedMessage
  );

  return {
    ciphertext: ciphertext,
    iv: iv
  };
}

// Decrypt a message using AES-GCM
export async function decryptMessage(ciphertext, key, iv) {
  const c = getCrypto();
  const decrypted = await c.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

// Export a key to a format that can be stored or transmitted
export async function exportKey(key) {
  const c = getCrypto();
  return await c.subtle.exportKey("jwk", key);
}

// Import a key from JWK format
export async function importKey(jwk, algorithm) {
  const c = getCrypto();
  return await c.subtle.importKey(
    "jwk",
    jwk,
    algorithm,
    true,
    ["encrypt", "decrypt"]
  );
}
