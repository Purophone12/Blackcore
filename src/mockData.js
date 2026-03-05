// Mock data for Demo Mode (no Firebase required)

export const DEMO_USER = {
  uid: 'demo-user-001',
  email: 'agent@blackcore.io',
  displayName: 'Agent Zero',
};

export const DEMO_GROUPS = [
  {
    id: 'demo-group-general',
    name: 'General',
    description: 'Main communication channel for all operatives.',
    owner: 'demo-user-001',
    members: ['demo-user-001', 'demo-user-002', 'demo-user-003'],
    isDM: false,
    icon: 'hub',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-group-ops',
    name: 'Ops Alpha',
    description: 'Classified operations channel. Eyes only.',
    owner: 'demo-user-002',
    members: ['demo-user-001', 'demo-user-002'],
    isDM: false,
    icon: 'terminal',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-dm-001',
    name: 'DM: Agent Zero & Ghost',
    description: 'Direct message',
    owner: 'demo-user-001',
    members: ['demo-user-001', 'demo-user-002'],
    isDM: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_MESSAGES = {
  'demo-group-general': [
    {
      id: 'msg-1',
      text: 'All operatives, welcome to Blackcore. This channel is E2EE protected.',
      uid: 'demo-user-003',
      displayName: 'Cipher',
      groupId: 'demo-group-general',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'msg-2',
      text: 'Copy that. Connection secure. Standing by.',
      uid: 'demo-user-002',
      displayName: 'Ghost',
      groupId: 'demo-group-general',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'msg-3',
      text: 'Agent Zero online. System checks out.',
      uid: 'demo-user-001',
      displayName: 'Agent Zero',
      groupId: 'demo-group-general',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'msg-4',
      text: 'All messages encrypted client-side. Firebase only sees encrypted blobs. Zero-trust architecture active.',
      uid: 'demo-user-003',
      displayName: 'Cipher',
      groupId: 'demo-group-general',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
  ],
  'demo-group-ops': [
    {
      id: 'msg-5',
      text: 'This channel is classified. AES-GCM 256-bit encryption active.',
      uid: 'demo-user-002',
      displayName: 'Ghost',
      groupId: 'demo-group-ops',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: 'msg-6',
      text: 'Mission parameters received. Awaiting go signal.',
      uid: 'demo-user-001',
      displayName: 'Agent Zero',
      groupId: 'demo-group-ops',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
  'demo-dm-001': [
    {
      id: 'msg-7',
      text: 'Hey, secure DM channel established.',
      uid: 'demo-user-002',
      displayName: 'Ghost',
      groupId: 'demo-dm-001',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'msg-8',
      text: 'Got it. Talk here. Nobody is listening.',
      uid: 'demo-user-001',
      displayName: 'Agent Zero',
      groupId: 'demo-dm-001',
      isEncrypted: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    },
  ],
};

export const DEMO_CONTACTS = [
  { id: 'demo-user-002', username: 'Ghost' },
  { id: 'demo-user-003', username: 'Cipher' },
];
