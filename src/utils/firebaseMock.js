/**
 * Firebase Mocking Layer for Demo Mode
 */

const isDemo = () => localStorage.getItem('blackcore_demo') === 'true';

export const getDemoUser = () => JSON.parse(localStorage.getItem('blackcore_user_demo'));

// Mock Firestore state for demo
let mockGroups = [
  { id: 'demo-gc-1', name: 'Global Hub', description: 'Public community space.', members: ['demo-user-id', 'agent-x'], isDM: false, createdAt: new Date().toISOString() },
  { id: 'demo-gc-2', name: 'Dev Ops', description: 'Internal operations.', members: ['demo-user-id', 'agent-y'], isDM: false, createdAt: new Date().toISOString() }
];

let mockMessages = [
  { id: 'm1', text: 'Welcome to the Blackcore Demo!', displayName: 'System', uid: 'system', groupId: 'demo-gc-1', createdAt: new Date().toISOString(), reactions: {} }
];

let mockUsers = [
    { uid: 'demo-user-id', username: 'Demo Agent', email: 'demo@blackcore.io' },
    { uid: 'agent-x', username: 'Agent X', email: 'x@blackcore.io' },
    { uid: 'agent-y', username: 'Agent Y', email: 'y@blackcore.io' }
];

export const wrapOnSnapshot = (originalFunc, q, callback, errorCallback) => {
  if (!isDemo()) return originalFunc(q, callback, errorCallback);

  // Basic mock logic based on query
  setTimeout(() => {
    if (q._query) {
        // Handle messages query
        const groupId = q._query.filters.find(f => f.field.basePath === 'groupId')?.value;
        if (groupId) {
            callback({
                docs: mockMessages.filter(m => m.groupId === groupId).map(m => ({ id: m.id, data: () => m }))
            });
            return;
        }
    }

    // Default to groups
    callback({
      docs: mockGroups.map(g => ({ id: g.id, data: () => g }))
    });
  }, 100);

  return () => {}; // Unsubscribe
};

export const wrapAddDoc = async (originalFunc, col, data) => {
  if (!isDemo()) return originalFunc(col, data);
  const newId = Math.random().toString(36).substr(2, 9);
  const doc = { id: newId, ...data };
  if (col._path?.segments?.includes('messages')) mockMessages.push(doc);
  return { id: newId };
};

export const wrapGetDoc = async (originalFunc, docRef) => {
    if (!isDemo()) return originalFunc(docRef);
    const id = docRef._path.segments[docRef._path.segments.length - 1];
    const group = mockGroups.find(g => g.id === id);
    return {
        exists: () => !!group,
        id: id,
        data: () => group
    };
};

export const wrapSetDoc = async (originalFunc, docRef, data) => {
    if (!isDemo()) return originalFunc(docRef, data);
    return true;
};

export const wrapGetDocs = async (originalFunc, q) => {
    if (!isDemo()) return originalFunc(q);
    return {
        empty: true,
        docs: []
    };
};

export const wrapDeleteDoc = async (originalFunc, docRef) => {
    if (!isDemo()) return originalFunc(docRef);
    return true;
};

export const wrapUpdateDoc = async (originalFunc, docRef, data) => {
    if (!isDemo()) return originalFunc(docRef, data);
    return true;
};
