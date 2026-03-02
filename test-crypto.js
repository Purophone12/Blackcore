import { generateSymmetricKey, encryptMessage, decryptMessage } from './src/utils/crypto.js';
import { webcrypto } from 'node:crypto';

// Polyfill window.crypto for Node.js testing
globalThis.window = {
    crypto: webcrypto
};
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

async function testCrypto() {
  try {
    console.log("Starting E2EE test...");

    const key = await generateSymmetricKey();
    console.log("Symmetric key generated.");

    const originalMessage = "Secret Blackcore Message";
    console.log("Original Message:", originalMessage);

    const encrypted = await encryptMessage(originalMessage, key);
    console.log("Message encrypted.");

    const decrypted = await decryptMessage(encrypted.ciphertext, key, encrypted.iv);
    console.log("Decrypted Message:", decrypted);

    if (originalMessage === decrypted) {
      console.log("SUCCESS: Encryption/Decryption works!");
    } else {
      console.error("FAILURE: Decrypted message does not match original.");
      process.exit(1);
    }
  } catch (error) {
    console.error("ERROR during crypto test:", error);
    process.exit(1);
  }
}

testCrypto();
