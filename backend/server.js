const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Blog = require('./models/Blog');
const Admin = require('./models/Admin');

const app = express();
app.use(express.json());
app.use(cors());

// Connect MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected Atlas');
    // Seed default admin if not exists
    const existingAdmin = await Admin.findOne({ email: 'admin@utsanova.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({ email: 'admin@utsanova.com', password: hashedPassword });
      console.log('Default admin seeded: admin@utsanova.com / admin123');
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

// --- PUBLIC BLOG ROUTES ---
app.get('/api/blogs', async (req, res) => {
  try {
    const { search, tag } = req.query;
    let query = { status: 'Published' };

    if (search) {
      query.$or = [
        { title: { $regex: search,$options: 'i' } },
        { content: { $regex: search,$options: 'i' } }
      ];
    }
    if (tag) {
      query.tags = tag;
    }

    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const { title, content, tags, conclusion, status } = req.body;
    const formattedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    const newBlog = await Blog.create({ title, content, tags: formattedTags, conclusion, status });
    res.status(201).json(newBlog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/blogs/:id', verifyToken, async (req, res) => {
  try {
    const { title, content, tags, conclusion, status } = req.body;
    const formattedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content, tags: formattedTags, conclusion, status },
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));