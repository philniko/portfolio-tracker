import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { portfolioAPI, questradeAPI } from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [questradeMessage, setQuestradeMessage] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [refreshToken, setRefreshToken] = useState('');
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await portfolioAPI.getAll();
      return response.data;
    },
  });

  const { data: questradeStatus } = useQuery({
    queryKey: ['questrade-status'],
    queryFn: async () => {
      const response = await questradeAPI.getStatus();
      return response.data;
    },
  });

  useEffect(() => {
    // Check for Questrade connection result
    if (searchParams.get('questrade_connected') === 'true') {
      setQuestradeMessage('Questrade connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['questrade-status'] });
      setTimeout(() => setQuestradeMessage(''), 5000);
    } else if (searchParams.get('questrade_error') === 'true') {
      setQuestradeMessage('Failed to connect Questrade. Please try again.');
      setTimeout(() => setQuestradeMessage(''), 5000);
    }
  }, [searchParams, queryClient]);

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

  const disconnectQuestradeMutation = useMutation({
    mutationFn: () => questradeAPI.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questrade-status'] });
      setQuestradeMessage('Questrade disconnected successfully');
      setTimeout(() => setQuestradeMessage(''), 5000);
    },
  });

  const connectTokenMutation = useMutation({
    mutationFn: (token: string) => questradeAPI.connectWithToken(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questrade-status'] });
      setQuestradeMessage('Questrade connected successfully!');
      setShowTokenInput(false);
      setRefreshToken('');
      setTimeout(() => setQuestradeMessage(''), 5000);
    },
    onError: (err: any) => {
      setQuestradeMessage(err.response?.data?.detail || 'Failed to connect Questrade');
      setTimeout(() => setQuestradeMessage(''), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (portfolioId: number) => portfolioAPI.delete(portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to delete portfolio');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleDelete = (e: React.MouseEvent, portfolioId: number, portfolioName: string) => {
    e.preventDefault(); // Prevent navigation
    if (window.confirm(`Are you sure you want to delete "${portfolioName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(portfolioId);
    }
  };

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

      {questradeMessage && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: questradeMessage.includes('success') ? '#d4edda' : '#f8d7da',
          color: questradeMessage.includes('success') ? '#155724' : '#721c24',
          borderRadius: '8px',
        }}>
          {questradeMessage}
        </div>
      )}

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ marginTop: 0 }}>Questrade Integration</h2>
        {questradeStatus?.connected ? (
          <div>
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>
              ✓ Questrade Connected
              {questradeStatus.last_sync_at && (
                <span style={{ marginLeft: '10px', fontWeight: 'normal', color: '#666' }}>
                  (Last synced: {new Date(questradeStatus.last_sync_at).toLocaleString()})
                </span>
              )}
            </p>
            <p>Accounts: {questradeStatus.account_count}</p>
            <div className="flex gap-md mt-md">
              <Link
                to="/questrade/positions"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                View Positions & Sync
              </Link>
              <button
                onClick={() => disconnectQuestradeMutation.mutate()}
                disabled={disconnectQuestradeMutation.isPending}
                className="btn-danger"
              >
                {disconnectQuestradeMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>Connect your Questrade account to automatically sync your holdings and transactions.</p>

            {!showTokenInput ? (
              <div>
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="btn-primary"
                >
                  Connect with Refresh Token
                </button>
                <p className="text-sm text-secondary mt-md">
                  Get your refresh token from the{' '}
                  <a href="https://www.questrade.com/api" target="_blank" rel="noopener noreferrer">
                    Questrade API Portal
                  </a>
                </p>
              </div>
            ) : (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Enter Refresh Token:
                </label>
                <input
                  type="text"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Paste your Questrade refresh token"
                  style={{ width: '100%', padding: '8px', marginBottom: '10px', maxWidth: '500px' }}
                />
                <div>
                  <button
                    onClick={() => connectTokenMutation.mutate(refreshToken)}
                    disabled={!refreshToken || connectTokenMutation.isPending}
                    style={{ backgroundColor: '#28a745', marginRight: '10px' }}
                  >
                    {connectTokenMutation.isPending ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTokenInput(false);
                      setRefreshToken('');
                    }}
                    style={{ backgroundColor: '#6c757d' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
              <div
                key={portfolio.id}
                style={{
                  position: 'relative',
                  padding: '20px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <Link
                  to={`/portfolio/${portfolio.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3>{portfolio.name}</h3>
                    {portfolio.questrade_account_id && (
                      <span className="badge badge-success" style={{ fontSize: '12px' }}>
                        🔗 Questrade
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#666' }}>{portfolio.description || 'No description'}</p>
                  <p style={{ marginTop: '10px', fontWeight: 'bold' }}>Holdings: {portfolio.holdings_count}</p>
                  {portfolio.last_questrade_sync && (
                    <p style={{ marginTop: '5px', fontSize: '12px', color: '#888' }}>
                      Last synced: {new Date(portfolio.last_questrade_sync).toLocaleString()}
                    </p>
                  )}
                </Link>
                <button
                  onClick={(e) => handleDelete(e, portfolio.id, portfolio.name)}
                  disabled={deleteMutation.isPending}
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Delete
                </button>
              </div>
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
