/**
 * E2EE Utilities using Web Crypto API
 */

// Generate an RSA key pair for asymmetric encryption (simulating user identity)
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
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
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message using AES-GCM
export async function encryptMessage(message, key) {
  const enc = new TextEncoder();
  const encodedMessage = enc.encode(message);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await window.crypto.subtle.encrypt(
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
  const decrypted = await window.crypto.subtle.decrypt(
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
  return await window.crypto.subtle.exportKey("jwk", key);
}

// Import a key from JWK format
export async function importKey(jwk, algorithm) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    algorithm,
    true,
    ["encrypt", "decrypt"]
  );
}
