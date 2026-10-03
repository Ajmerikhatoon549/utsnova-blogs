const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { saveImage } = require('./imageStore');

const Blog = require('./models/Blog');
const Admin = require('./models/Admin');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const app = express();
app.use(express.json());

// FRONTEND_URL = your Vercel address (no trailing slash). Several addresses: separate with commas.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(u => u.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

// Health check - used by the uptime pinger to keep Render awake
app.get('/', (req, res) => res.send('Blog API is running'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Connect MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected Atlas');
    // Admin account: ADMIN_EMAIL / ADMIN_PASSWORD from .env (use these on Render)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const hashed = await bcrypt.hash(adminPassword, 10);
      await Admin.findOneAndUpdate({ email: adminEmail }, { password: hashed }, { upsert: true });
      // remove the old weak default admin
      if (adminEmail !== 'admin@utsanova.com') await Admin.deleteOne({ email: 'admin@utsanova.com' });
      console.log(`Admin ready: ${adminEmail}`);
    } else {
      const existingAdmin = await Admin.findOne({ email: 'admin@utsanova.com' });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await Admin.create({ email: 'admin@utsanova.com', password: hashedPassword });
      }
      console.log('WARNING: using the default admin. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before going live.');
    }
  })
  .catch(err => console.log(err));

// Middleware for Admin Auth
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Access denied. No token provided.' });
  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.admin = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, message: 'Logged in successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PUBLIC BLOG ROUTES (With Pagination, Search & Tag Filters) ---
app.get('/api/blogs', async (req, res) => {
  try {
    // Pagination parameters (Default: page 1, limit 6 blogs per page for perfect 3-column rows)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const { search, tag } = req.query;
    let query = { status: 'Published' };

    if (search && search.trim()) {
      // "#react" and "react" both work: remove a leading # first
      const term = escapeRegex(search.trim().replace(/^#/, ''));
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { content: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } }
      ];
    }

    // Used when someone clicks a tag on a blog card
    if (tag) {
      query.tags = { $regex: escapeRegex(tag), $options: 'i' };
    }

    // Fetch paginated blogs
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for frontend pagination controls
    const totalBlogs = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      currentPage: page,
      totalPages: Math.ceil(totalBlogs / limit),
      totalBlogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Blog not found' });
    // Drafts are private: only Published blogs can be opened publicly
    const blog = await Blog.findOne({ _id: req.params.id, status: 'Published' });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- IMAGE UPLOAD ---
// Local development only: serve files saved in backend/uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, GIF or WEBP images are allowed'));
  }
});

app.post('/api/admin/upload', verifyToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    try {
      const url = await saveImage(req.file.buffer, path.extname(req.file.originalname).toLowerCase());
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: 'Image upload failed: ' + e.message });
    }
  });
});

app.post('/api/admin/generate-blog', verifyToken, require('./generateBlog'));

// --- ADMIN CRUD ROUTES ---
app.get('/api/admin/blogs', verifyToken, async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/blogs', verifyToken, async (req, res) => {
  try {
    const { title, content, tags, conclusion, status, coverImage } = req.body;
    const formattedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    const newBlog = await Blog.create({ title, content, tags: formattedTags, conclusion, status, coverImage });
    res.status(201).json(newBlog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/blogs/:id', verifyToken, async (req, res) => {
  try {
    const { title, content, tags, conclusion, status, coverImage } = req.body;
    const formattedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content, tags: formattedTags, conclusion, status, coverImage },
      { new: true }
    );
    res.json(updatedBlog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/blogs/:id', verifyToken, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
  try {
    const total = await Blog.countDocuments();
    const published = await Blog.countDocuments({ status: 'Published' });
    const drafts = await Blog.countDocuments({ status: 'Draft' });
    res.json({ total, published, drafts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
require('./cronJobs'); // scheduled jobs

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));