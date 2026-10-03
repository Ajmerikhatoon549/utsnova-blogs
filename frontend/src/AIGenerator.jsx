// frontend/src/AIGenerator.jsx
import { useState } from 'react';
import axios from 'axios';
import { Sparkles } from 'lucide-react';

export default function AIGenerator({ api, token, onGenerated }) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [withImage, setWithImage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const generate = async () => {
    setError('');
    setNotice('');
    if (topic.trim().length < 3) {
      setError('Please enter a topic first.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${api}/admin/generate-blog`,
        { topic, tone, length, withImage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { title, content, tags, conclusion, coverImage, imageWarning } = res.data;
      // Fill the "Create New Blog" form as a Draft so the admin can review it
      onGenerated({ title, content, tags: tags.join(', '), conclusion, coverImage, status: 'Draft' });
      if (imageWarning) setNotice(imageWarning);
      setTopic('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate the blog. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ borderLeft: '4px solid #4f46e5' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={18} color="#4f46e5" /> Generate Blog with AI
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '15px' }}>
        Enter a topic. The AI writes a draft and a cover image into the form below, and you review it before publishing.
      </p>

      {error && (
        <p style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', fontSize: '0.9rem', borderRadius: '6px', marginBottom: '15px' }}>
          {error}
        </p>
      )}
      {notice && (
        <p style={{ background: '#fef3c7', color: '#92400e', padding: '10px', fontSize: '0.9rem', borderRadius: '6px', marginBottom: '15px' }}>
          {notice}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="e.g. Benefits of cloud computing for startups"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') generate(); }}
          disabled={loading}
        />
        <select value={tone} onChange={e => setTone(e.target.value)} disabled={loading}>
          <option value="professional">Professional</option>
          <option value="friendly and conversational">Friendly</option>
          <option value="simple, for beginners">Beginner</option>
          <option value="technical and detailed">Technical</option>
        </select>
        <select value={length} onChange={e => setLength(e.target.value)} disabled={loading}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569', marginBottom: '14px', cursor: 'pointer' }}>
        <input type="checkbox" checked={withImage} onChange={e => setWithImage(e.target.checked)} disabled={loading} style={{ width: 'auto' }} />
        Also generate a cover image with AI
      </label>

      <button type="button" onClick={generate} disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.7 : 1 }}>
        <Sparkles size={16} /> {loading ? 'Generating... (up to 1 minute)' : 'Generate with AI'}
      </button>
    </div>
  );
}