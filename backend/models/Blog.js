const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: [String], required: true },
  conclusion: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);