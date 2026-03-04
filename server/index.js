const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5001;
const JWT_SECRET = 'blackcore_secret_key_2024'; // In production, use env var

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

const loadData = (file) => {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
};

const saveData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Socket.io Logic ---
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('call-user', ({ to, from, offer }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('incoming-call', { from, offer });
    }
  });

  socket.on('answer-call', ({ to, answer }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call-answered', { answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', ({ to }) => {
    const toSocketId = activeUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit('call-ended');
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// --- API Endpoints ---
app.get('/api/users', authenticateToken, (req, res) => {
  const users = loadData(USERS_FILE).map(u => ({ id: u.id, username: u.username, email: u.email }));
  res.json(users);
});

app.post('/api/signup', async (req, res) => {
  const { email, password, username } = req.body;
  const users = loadData(USERS_FILE);
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now().toString(), email, password: hashedPassword, username };
  users.push(newUser);
  saveData(USERS_FILE, users);

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
  res.json({ user: { id: newUser.id, email: newUser.email, username: newUser.username }, token });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const users = loadData(USERS_FILE);
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ user: { id: user.id, email: user.email, username: user.username }, token });
});

app.get('/api/groups', authenticateToken, (req, res) => {
  const groups = loadData(GROUPS_FILE);
  res.json(groups);
});

app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, description, owner, members, type, isDM } = req.body;
  const groups = loadData(GROUPS_FILE);
  const newGroup = { id: Date.now().toString(), name, description, owner, members, type: type || 'group', isDM: isDM || false, createdAt: new Date().toISOString() };
  groups.push(newGroup);
  saveData(GROUPS_FILE, groups);
  res.json(newGroup);
});

app.get('/api/groups/:id', authenticateToken, (req, res) => {
  const groups = loadData(GROUPS_FILE);
  const group = groups.find(g => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

app.put('/api/groups/:id', authenticateToken, (req, res) => {
  const groups = loadData(GROUPS_FILE);
  const index = groups.findIndex(g => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Group not found' });

  // Basic check: only members can update? Or owner?
  if (!groups[index].members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
  }

  groups[index] = { ...groups[index], ...req.body };
  saveData(GROUPS_FILE, groups);
  res.json(groups[index]);
});

app.get('/api/messages/:groupId', authenticateToken, (req, res) => {
  const groups = loadData(GROUPS_FILE);
  const group = groups.find(g => g.id === req.params.groupId);
  if (!group || !group.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Unauthorized access to messages' });
  }

  const allMessages = loadData(MESSAGES_FILE);
  const groupMessages = allMessages.filter(m => m.groupId === req.params.groupId);
  res.json(groupMessages);
});

app.post('/api/messages', authenticateToken, (req, res) => {
  const messages = loadData(MESSAGES_FILE);
  const newMessage = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
  messages.push(newMessage);
  saveData(MESSAGES_FILE, messages);
  res.json(newMessage);
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/health', (req, res) => {
  res.json({ status: 'active' });
});

app.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    path: `/download/${req.file.filename}`
  });
});

app.get('/download/:filename', authenticateToken, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'uploads', filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found.');
  }
});

server.listen(port, () => {
  console.log(`Blackcore Integrated Real-time Server listening at http://localhost:${port}`);
});
