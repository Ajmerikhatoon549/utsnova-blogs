import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIGenerator from './AIGenerator';
import {
  Search, BookOpen, LayoutDashboard, PlusCircle, LogOut, Trash2, Edit, CheckCircle, FileText,
  Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon, Code, Quote, Eye, Pencil, Image as ImageIcon
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SERVER = API.replace(/\/api\/?$/, '');

// Adds the server address to uploaded image paths like "/uploads/xxx.jpg"
const imgUrl = (src) => (src && src.startsWith('/uploads') ? SERVER + src : src);

// Uploaded images are stored as "/uploads/xxx.jpg" - add the server address when showing them
const mdComponents = {
  img: ({ src, alt }) => (
    <img src={src && src.startsWith('/uploads') ? SERVER + src : src} alt={alt || ''} />
  ),
};

export default function App() {
  return (
    <BrowserRouter>
      <div>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Navbar() {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  return (
    <nav>
      <Link to="/" className="brand">
        <BookOpen size={22}/> Utsanova Blogs
      </Link>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/">Home</Link>
        {token ? (
          <>
            <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LayoutDashboard size={16}/> Dashboard
            </Link>
            <button onClick={() => { localStorage.removeItem('token'); navigate('/admin/login'); }} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.8rem' }}>
              <LogOut size={16}/> Logout
            </button>
          </>
        ) : (
          <Link to="/admin/login" style={{ background: '#4f46e5', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none' }}>Admin Login</Link>
        )}
      </div>
    </nav>
  );
}

const excerpt = (md) =>
  md.replace(/[#*_`>~\[\]()!-]/g, '').replace(/\s+/g, ' ').trim().substring(0, 100);

function Home() {
  const [blogs, setBlogs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 6; // 6 blogs per page = 2 full rows of 3

  useEffect(() => {
    fetchBlogs(currentPage);
  }, [search, selectedTag, currentPage]);

  const fetchBlogs = async (page) => {
    try {
      const res = await axios.get(`${API}/blogs`, {
        params: { search, tag: selectedTag, page, limit }
      });
      // Backend se ab { blogs, currentPage, totalPages } aa raha hai
      setBlogs(res.data.blogs);
      setCurrentPage(res.data.currentPage);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    }
  };

  // Jab search ya tag change ho toh page 1 par reset kar dein
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleTagSelect = (t) => {
    setSelectedTag(t);
    setCurrentPage(1);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', margin: '2rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Latest Insights & Ideas</h1>
        <p style={{ color: '#64748b' }}>Explore technical articles, product design, and career growth tips.</p>
        
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', maxWidth: '400px', margin: '20px auto 0' }}>
          <input 
            type="text" 
            placeholder="Search by title, content or #tag..." 
            value={search}
            onChange={handleSearchChange}
          />
          {selectedTag && (
            <button onClick={() => { setSelectedTag(''); setCurrentPage(1); }} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>Clear Tag</button>
          )}
        </div>
      </div>

      <div className="grid-3">
        {blogs.map(blog => (
          <div key={blog._id} className="card">
            <div>
              {blog.coverImage && (
                <img src={imgUrl(blog.coverImage)} alt={blog.title} onError={(e) => { e.target.style.display = 'none'; }}
                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>
                <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                <span className="badge">{blog.status}</span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '10px', color: '#1e293b' }}>{blog.title}</h2>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.5' }}>{excerpt(blog.content)}...</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
                {blog.tags.map((t, idx) => (
                  <span key={idx} onClick={() => handleTagSelect(t)} className="tag" style={{ cursor: 'pointer' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
            <Link to={`/blog/${blog._id}`} style={{ color: '#4f46e5', fontWeight: '600', fontSize: '0.9rem', textDecoration: 'none' }}>Read More &rarr;</Link>
          </div>
        ))}
        {blogs.length === 0 && <p style={{ textAlign: 'center', gridColumn: 'span 3', color: '#64748b', marginTop: '2rem' }}>No blogs found.</p>}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '3rem 0' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            &larr; Previous
          </button>

          <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
function BlogDetail() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/blogs/${id}`)
      .then(res => setBlog(res.data))
      .catch(err => console.error(err));
  }, [id]);

  if (!blog) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px', width: '100%', margin: '2rem auto', padding: '0 20px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          {new Date(blog.createdAt).toLocaleDateString()}
        </span>
        
        <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: '10px 0 15px', color: '#1e293b' }}>
          {blog.title}
        </h1>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', flexWrap: 'wrap' }}>
          {blog.tags.map((t, i) => <span key={i} className="badge">#{t}</span>)}
        </div>

        {/* --- 2. Yahan ReactMarkdown ka use karein content dikhane ke liye --- */}
        {blog.coverImage && (
          <img src={imgUrl(blog.coverImage)} alt={blog.title} onError={(e) => { e.target.style.display = 'none'; }}
            style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '10px', marginBottom: '25px' }} />
        )}

        <div className="markdown-body" style={{ fontSize: '1.05rem', marginBottom: '35px' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{blog.content}</ReactMarkdown>
        </div>

        {blog.conclusion && (
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Conclusion</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '5px', lineHeight: '1.6' }}>
              {blog.conclusion}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/admin/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', color: '#1e293b' }}>Admin Login</h2>
      {error && <p style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', fontSize: '0.9rem', borderRadius: '6px', marginBottom: '15px' }}>{error}</p>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@utsanova.com"/>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"/>
        </div>
        <button type="submit" style={{ width: '100%', padding: '0.75rem', marginTop: '10px' }}>Login</button>
      </form>
    </div>
  );
}

function MarkdownEditor({ value, onChange }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload an image and insert it into the content as Markdown
  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('image', file);
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/admin/upload`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pos = ref.current.selectionStart;
      const alt = file.name.replace(/\.[^.]+$/, '');
      const md = `\n![${alt}](${res.data.url})\n`;
      onChange(value.slice(0, pos) + md + value.slice(pos));
    } catch (err) {
      alert(err.response?.data?.error || 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Wrap selected text (bold, italic, code, link...)
  const wrap = (before, after, placeholder) => {
    const el = ref.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // Add a prefix at the start of the line (heading, list, quote)
  const linePrefix = (prefix, placeholder) => {
    const el = ref.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const needsNewline = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    onChange(value.slice(0, start) + needsNewline + prefix + selected + value.slice(end));
    setTimeout(() => el.focus(), 0);
  };

  const tools = [
    { icon: <Bold size={14}/>, label: 'Bold', run: () => wrap('**', '**', 'bold text') },
    { icon: <Italic size={14}/>, label: 'Italic', run: () => wrap('*', '*', 'italic text') },
    { icon: <Heading2 size={14}/>, label: 'Heading', run: () => linePrefix('## ', 'Heading') },
    { icon: <List size={14}/>, label: 'List', run: () => linePrefix('- ', 'List item') },
    { icon: <ListOrdered size={14}/>, label: '1. List', run: () => linePrefix('1. ', 'List item') },
    { icon: <Quote size={14}/>, label: 'Quote', run: () => linePrefix('> ', 'Quote') },
    { icon: <Code size={14}/>, label: 'Code', run: () => wrap('`', '`', 'code') },
    { icon: <LinkIcon size={14}/>, label: 'Link', run: () => wrap('[', '](https://)', 'link text') },
  ];

  return (
    <div>
      <div className="md-toolbar">
        {tools.map(t => (
          <button key={t.label} type="button" className="btn-secondary" onClick={t.run} disabled={preview}>
            {t.icon} {t.label}
          </button>
        ))}
        <button type="button" className="btn-secondary" onClick={() => fileRef.current.click()} disabled={preview || uploading}>
          <ImageIcon size={14}/> {uploading ? 'Uploading...' : 'Image'}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleImage} style={{ display: 'none' }} />
        <button type="button" onClick={() => setPreview(!preview)} style={{ marginLeft: 'auto' }}>
          {preview ? <><Pencil size={14}/> Edit</> : <><Eye size={14}/> Preview</>}
        </button>
      </div>

      {preview ? (
        <div className="md-preview markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{value || '*Nothing to preview yet...*'}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={ref}
          rows="10"
          placeholder="Write your blog in Markdown..."
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          style={{ fontFamily: 'Consolas, monospace' }}
        />
      )}
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 });
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', tags: '', conclusion: '', status: 'Draft' });
  const [editingId, setEditingId] = useState(null);
  const token = localStorage.getItem('token');
  const headers = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, blogsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, headers),
        axios.get(`${API}/admin/blogs`, headers)
      ]);
      setStats(statsRes.data);
      setBlogs(blogsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`${API}/admin/blogs/${editingId}`, form, headers);
      setEditingId(null);
    } else {
      await axios.post(`${API}/admin/blogs`, form, headers);
    }
    setForm({ title: '', content: '', tags: '', conclusion: '', status: 'Draft' });
    fetchData();
  };

  const handleEdit = (blog) => {
    setEditingId(blog._id);
    setForm({ ...blog, tags: blog.tags.join(', ') });
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this blog?")) {
      await axios.delete(`${API}/admin/blogs/${id}`, headers);
      fetchData();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="grid-3" style={{ margin: 0 }}>
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div><p style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Blogs</p><h3 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.total}</h3></div>
          <FileText color="#4f46e5" size={32}/>
        </div>
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div><p style={{ color: '#64748b', fontSize: '0.85rem' }}>Published Blogs</p><h3 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.published}</h3></div>
          <CheckCircle color="#16a34a" size={32}/>
        </div>
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div><p style={{ color: '#64748b', fontSize: '0.85rem' }}>Drafts</p><h3 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.drafts}</h3></div>
          <LayoutDashboard color="#d97706" size={32}/>
        </div>
      </div>

      <AIGenerator api={API} token={token} onGenerated={(blog) => { setEditingId(null); setForm(blog); }} />

      <div className="card">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}>{editingId ? 'Edit Blog' : 'Create New Blog'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" placeholder="Blog Title" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} required/>
            <input type="text" placeholder="Tags (comma separated e.g. React, Node)" value={form.tags} onChange={e=>setForm({...form, tags: e.target.value})} required/>
          </div>
          <MarkdownEditor value={form.content} onChange={v => setForm({ ...form, content: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" placeholder="Conclusion" value={form.conclusion} onChange={e=>setForm({...form, conclusion: e.target.value})} required/>
            <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})}>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>
          {form.coverImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img src={imgUrl(form.coverImage)} alt="Cover"
                style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} />
              <button type="button" className="btn-danger" onClick={() => setForm({ ...form, coverImage: '' })}>
                Remove cover image
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit">{editingId ? 'Update Blog' : 'Publish Blog'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', content: '', tags: '', conclusion: '', status: 'Draft' }); }} className="btn-secondary">Cancel</button>}
          </div>
        </form>
      </div>

      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}>Manage All Blogs</h3>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Tags</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map(blog => (
              <tr key={blog._id}>
                <td style={{ fontWeight: '500' }}>{blog.title}</td>
                <td><span className="badge" style={{ background: blog.status==='Published' ? '#dcfce7' : '#fef3c7', color: blog.status==='Published' ? '#166534' : '#92400e' }}>{blog.status}</span></td>
                <td style={{ color: '#64748b' }}>{blog.tags.join(', ')}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => handleEdit(blog)} style={{ background: 'transparent', color: '#2563eb', padding: '5px', cursor: 'pointer' }}><Edit size={16}/></button>
                  <button onClick={() => handleDelete(blog._id)} style={{ background: 'transparent', color: '#dc2626', padding: '5px', cursor: 'pointer', marginLeft: '10px' }}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {blogs.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No blogs found in database.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}