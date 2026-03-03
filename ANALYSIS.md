# Blackcore Analysis & Improvements

## Summary
Blackcore is a secure, E2EE (End-to-End Encrypted) messaging platform with a Discord-inspired interface. It leverages Firebase for real-time synchronization and authentication, while implementing client-side encryption using the Web Crypto API.

## Technical Analysis
- **Security:** Uses AES-GCM for message and file encryption. Keys are derived from group IDs and a master secret.
- **Frontend:** Built with React 19, Vite, and Tailwind CSS 4. The UI is highly responsive and uses modern styling patterns.
- **Backend:** A hybrid approach using Firebase Firestore for messages and a local Node.js server for encrypted file storage.

## Implemented Improvements
1. **Real-time Reactions:** Replaced hardcoded UI placeholders with a functional Firestore-backed reaction system.
2. **Security Hardening:** Moved the hardcoded master secret to environment variables (`VITE_APP_SECRET`) and removed insecure fallbacks.
3. **Decryption Error Handling:** Improved user feedback when decryption fails due to key mismatches or data corruption.
4. **Unit Testing:** Added a comprehensive test suite for cryptographic utilities using Vitest.

## Recommended Future Improvements
1. **Dynamic Key Exchange:** Replace the single master secret with a Diffie-Hellman (DH) or Double Ratchet protocol for better forward secrecy.
2. **File Server Authentication:** Implement JWT or similar authentication for the local file server to prevent unauthorized access to encrypted blobs.
3. **Presence System:** Implement a real-time "who's online" system using Firebase Realtime Database or Firestore.
4. **Message Edit/Delete:** Extend the message schema to support editing and deleting of encrypted content.
