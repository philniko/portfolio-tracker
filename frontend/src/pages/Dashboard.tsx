import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { portfolioAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await portfolioAPI.getAll();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => portfolioAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setShowCreateForm(false);
      setName('');
      setDescription('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create portfolio');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }
    createMutation.mutate({ name, description });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Portfolio Dashboard</h1>
        <div>
          <span style={{ marginRight: '20px' }}>Welcome, {user?.username}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Your Portfolios</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ backgroundColor: '#28a745', padding: '10px 20px' }}
          >
            {showCreateForm ? 'Cancel' : '+ Create Portfolio'}
          </button>
        </div>

        {showCreateForm && (
          <div style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3>Create New Portfolio</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label>Portfolio Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g., Tech Stocks, Growth Portfolio"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Description (optional):</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your investment strategy..."
                  rows={3}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Portfolio'}
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : portfolios && portfolios.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {portfolios.map((portfolio: any) => (
              <Link
                key={portfolio.id}
                to={`/portfolio/${portfolio.id}`}
                style={{
                  padding: '20px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <h3>{portfolio.name}</h3>
                <p style={{ color: '#666' }}>{portfolio.description || 'No description'}</p>
                <p style={{ marginTop: '10px', fontWeight: 'bold' }}>Holdings: {portfolio.holdings_count}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No portfolios yet. Click "Create Portfolio" to get started!
          </p>
        )}
      </div>
    </div>
  );
}
