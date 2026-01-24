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
    <div className="container">
      <div className="dashboard-header">
        <h1 className="page-title" style={{ fontSize: '36px' }}>Portfolio Dashboard</h1>
        <div className="flex gap-md" style={{ alignItems: 'center' }}>
          <span className="font-bold">Welcome, {user?.username}!</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </div>

      {questradeMessage && (
        <div className={questradeMessage.includes('success') ? 'alert alert-success' : 'alert alert-error'}>
          {questradeMessage}
        </div>
      )}

      <div className="card mb-xl">
        <h2 className="card-header">Questrade Integration</h2>
        {questradeStatus?.connected ? (
          <div>
            <p className="text-success font-bold">
              ✓ Questrade Connected
              {questradeStatus.last_sync_at && (
                <span className="font-medium text-secondary" style={{ marginLeft: '10px' }}>
                  (Last synced: {new Date(questradeStatus.last_sync_at).toLocaleString()})
                </span>
              )}
            </p>
            <p className="mb-md">Accounts: {questradeStatus.account_count}</p>
            <div className="flex gap-md mt-md">
              <Link
                to="/questrade/positions"
                className="btn-primary"
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
            <p className="mb-md">Connect your Questrade account to automatically sync your holdings and transactions.</p>

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
              <div className="mt-md">
                <div className="alert alert-info mb-md">
                  <h4 className="font-bold mb-sm" style={{ fontSize: '14px' }}>📋 How to Get Your Questrade Refresh Token:</h4>
                  <ol style={{ marginLeft: '20px', marginBottom: '10px' }}>
                    <li className="mb-sm">
                      Log in to your Questrade account at{' '}
                      <a href="https://www.questrade.com" target="_blank" rel="noopener noreferrer">
                        questrade.com
                      </a>
                    </li>
                    <li className="mb-sm">
                      Go to the{' '}
                      <a href="https://www.questrade.com/api" target="_blank" rel="noopener noreferrer">
                        Questrade API Portal
                      </a>
                    </li>
                    <li className="mb-sm">
                      Click <strong>"Generate Refresh Token"</strong>
                    </li>
                    <li className="mb-sm">
                      Copy the refresh token (starts with a long string of letters and numbers)
                    </li>
                    <li className="mb-sm">
                      Paste it in the field below
                    </li>
                  </ol>
                  <p className="text-sm text-secondary">
                    <strong>Note:</strong> Your refresh token is stored securely and is only used to access your Questrade data.
                    Each user connects their own Questrade account - tokens are not shared.
                  </p>
                </div>

                <div className="form-group">
                  <label>Enter Refresh Token:</label>
                  <input
                    type="text"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    placeholder="Paste your Questrade refresh token here..."
                    style={{ maxWidth: '600px' }}
                  />
                </div>
                <div className="flex gap-md">
                  <button
                    onClick={() => connectTokenMutation.mutate(refreshToken)}
                    disabled={!refreshToken || connectTokenMutation.isPending}
                    className="btn-success"
                  >
                    {connectTokenMutation.isPending ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTokenInput(false);
                      setRefreshToken('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-xl">
        <div className="flex-between mb-lg">
          <h2 className="card-header" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Your Portfolios</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-success"
          >
            {showCreateForm ? 'Cancel' : '+ Create Portfolio'}
          </button>
        </div>

        {showCreateForm && (
          <div className="card mb-lg">
            <h3 className="font-extrabold mb-md">Create New Portfolio</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Portfolio Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g., Tech Stocks, Growth Portfolio"
                />
              </div>
              <div className="form-group">
                <label>Description (optional):</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your investment strategy..."
                  rows={3}
                />
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create Portfolio'}
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <p className="font-bold">Loading...</p>
        ) : portfolios && portfolios.length > 0 ? (
          <div className="portfolio-grid">
            {portfolios.map((portfolio: any) => (
              <div
                key={portfolio.id}
                className="card"
                style={{ position: 'relative' }}
              >
                <Link
                  to={`/portfolio/${portfolio.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                  }}
                >
                  <div className="flex gap-md" style={{ alignItems: 'center', marginBottom: '12px' }}>
                    <h3 className="font-extrabold">{portfolio.name}</h3>
                    {portfolio.questrade_account_id && (
                      <span className="badge badge-success">
                        🔗 Questrade
                      </span>
                    )}
                  </div>
                  <p className="text-secondary mb-md">{portfolio.description || 'No description'}</p>
                  <p className="font-bold mt-md">Holdings: {portfolio.holdings_count}</p>
                  {portfolio.last_questrade_sync && (
                    <p className="text-sm text-secondary mt-sm">
                      Last synced: {new Date(portfolio.last_questrade_sync).toLocaleString()}
                    </p>
                  )}
                </Link>
                <button
                  onClick={(e) => handleDelete(e, portfolio.id, portfolio.name)}
                  disabled={deleteMutation.isPending}
                  className="btn-danger"
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    padding: '8px 12px',
                    fontSize: '11px',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary text-center" style={{ padding: '40px' }}>
            No portfolios yet. Click "Create Portfolio" to get started!
          </p>
        )}
      </div>
    </div>
  );
}
