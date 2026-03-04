# Blackcore - Secure E2EE Messaging Platform

Blackcore is a high-performance, globally accessible messaging platform featuring end-to-end encryption (E2EE) by default. Built with React 19, Vite, and Tailwind CSS v4.

## Features

- **End-to-End Encryption:** All messages and files are encrypted client-side using the Web Crypto API (AES-GCM).
- **Global Accessibility:** Powered entirely by Firebase. Connect from any device by just adding your API keys.
- **Discord-style Layout:** Multi-pane sidebar for navigating spaces and direct messages.
- **Real-time Sync:** Firestore-driven messaging and state management.
- **Secure File Sharing:** Encrypted file attachments stored securely in Firebase Storage.
- **WebRTC Voice Calls:** Secure voice links with signaling over Firestore.
- **Dynamic Theming:** Customize your experience with various color protocols.
- **Invitation System:** Easily add members to spaces via secure join links.

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Firebase Project (Auth, Firestore, and Storage enabled)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Create a `.env` file in the root directory and add your Firebase credentials. You can use `.env.example` as a template:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running the Application

1. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

## Security

Blackcore uses a "Zero Trust" architecture. Your messages and files are encrypted before they ever leave your device. Firebase only stores encrypted blobs and metadata, ensuring your data remains private even if the service provider is compromised.

## License

MIT
