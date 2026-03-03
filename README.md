# Blackcore - Secure E2EE Messaging Platform

Blackcore is a high-performance, decentralized messaging platform featuring end-to-end encryption (E2EE) by default. Built with React 19, Vite, and Tailwind CSS v4.

## Features

- **End-to-End Encryption:** All messages and files are encrypted client-side using the Web Crypto API (AES-GCM).
- **Discord-style Layout:** Multi-pane sidebar for navigating spaces and direct messages.
- **Real-time Sync:** Powered by Firebase (Auth & Firestore) for seamless communication.
- **Local File Storage:** Encrypted file attachments are stored on a local server rather than cloud providers.
- **Dynamic Theming:** Customize your experience with various color protocols.
- **Invitation System:** Easily add members to spaces via secure join links.

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Firebase Project (Auth and Firestore enabled)

### Installation

1. Clone the repository.
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Install file server dependencies:
   ```bash
   cd server && npm install && cd ..
   ```

### Configuration

Create a `.env` file in the root directory and add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running the Application

You need to run both the Vite development server and the local file server.

1. **Start the File Server:**
   ```bash
   node server/index.js
   ```
   The file server will run at `http://localhost:5001`.

2. **Start the Vite Frontend:**
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:5173`.

## Security

Blackcore uses a "Zero Trust" architecture. Even if our servers are compromised, your data remains encrypted and inaccessible to unauthorized parties. Each space uses a unique derived key for its communications.

## License

MIT
