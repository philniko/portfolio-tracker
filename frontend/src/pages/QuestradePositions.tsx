import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questradeAPI, portfolioAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function QuestradePositions() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['questrade-accounts'],
    queryFn: async () => {
      const response = await questradeAPI.getAccounts();
      return response.data;
    },
    retry: 2,
  });

  const { data: portfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await portfolioAPI.getAll();
      return response.data;
    },
  });

  const { data: positions, isLoading: positionsLoading, error: positionsError } = useQuery({
    queryKey: ['questrade-positions', selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return null;
      const response = await questradeAPI.getPositions(selectedAccount);
      return response.data;
    },
    enabled: !!selectedAccount,
    retry: 2,
  });

  const { data: balances, error: balancesError } = useQuery({
    queryKey: ['questrade-balances', selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return null;
      const response = await questradeAPI.getBalances(selectedAccount);
      return response.data;
    },
    enabled: !!selectedAccount,
    retry: 2,
  });

  const syncMutation = useMutation({
    mutationFn: (data: { portfolio_id: number; account_id: string }) =>
      questradeAPI.syncToPortfolio(data.portfolio_id, data.account_id, true),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      const message = data.message || 'Successfully synced!';
      setSyncMessage(message);
      setTimeout(() => setSyncMessage(''), 5000);
    },
    onError: (err: any) => {
      setSyncMessage(err.response?.data?.detail || 'Failed to sync positions');
      setTimeout(() => setSyncMessage(''), 5000);
    },
  });

  const handleSync = () => {
    if (selectedPortfolio && selectedAccount) {
      syncMutation.mutate({
        portfolio_id: selectedPortfolio,
        account_id: selectedAccount,
      });
    }
  };

  if (accountsLoading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div className="container">
      <Link to="/dashboard" className="mb-lg" style={{ display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <div className="page-header">
        <h1 className="page-title">Questrade Positions</h1>
        <p className="page-subtitle">View and sync your Questrade account positions</p>
      </div>

      {syncMessage && (
        <div className={syncMessage.includes('Success') ? 'alert alert-success' : 'alert alert-error'}>
          {syncMessage}
        </div>
      )}

      <div className="mb-xl">
        <h2 className="text-xl font-semibold mb-md">Select Account</h2>
        {accountsError && (
          <div className="alert alert-error">
            <strong>Questrade Connection Expired</strong>
            <p style={{ marginTop: '10px', marginBottom: '10px' }}>
              Your Questrade access token has expired. Questrade tokens expire after 30 minutes.
            </p>
            <p style={{ marginBottom: '10px' }}>
              To reconnect:
            </p>
            <ol style={{ marginLeft: '20px', marginBottom: '10px' }}>
              <li>Go back to the <Link to="/dashboard">Dashboard</Link></li>
              <li>Click "Disconnect" in the Questrade section</li>
              <li>Get a new refresh token from <a href="https://www.questrade.com/api" target="_blank" rel="noopener noreferrer">Questrade API Portal</a></li>
              <li>Click "Connect with Refresh Token" and enter your new token</li>
            </ol>
          </div>
        )}
        <div className="grid grid-auto gap-lg">
          {accounts?.map((account: any) => (
            <div
              key={account.number}
              onClick={() => setSelectedAccount(account.number)}
              className="card"
              style={{
                cursor: 'pointer',
                border: selectedAccount === account.number ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: selectedAccount === account.number ? 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 100%)' : 'var(--bg-primary)',
              }}
            >
              <div className="font-bold text-lg">{account.type}</div>
              <div className="text-sm text-secondary">Account: {account.number}</div>
              <div className="badge badge-success mt-sm">{account.status}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedAccount && (
        <>
          {balancesError && (
            <div className="alert alert-error">
              Error loading balances: {(balancesError as any)?.message || 'Unknown error'}
            </div>
          )}
          {positionsError && (
            <div className="alert alert-error">
              Error loading positions: {(positionsError as any)?.message || 'Unknown error'}
            </div>
          )}
          {balances && balances.length > 0 && (
            <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)' }}>
              <h3 className="card-header">Account Balances</h3>
              <div className="grid grid-auto gap-md">
                {balances.map((balance: any, index: number) => (
                  <div key={index} className="stats-card">
                    <div className="stats-label">{balance.currency}</div>
                    <div className="text-base mb-sm">Cash: ${balance.cash.toFixed(2)}</div>
                    <div className="text-base mb-sm">Market Value: ${balance.marketValue.toFixed(2)}</div>
                    <div className="stats-value text-primary">
                      ${balance.totalEquity.toFixed(2)}
                    </div>
                    <div className="text-sm text-secondary">Total Equity</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mb-lg">
            <h3 className="card-header">Sync to Portfolio</h3>
            <div className="flex gap-md" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label>Select Portfolio</label>
                <select
                  value={selectedPortfolio || ''}
                  onChange={(e) => setSelectedPortfolio(Number(e.target.value))}
                >
                  <option value="">Select a portfolio...</option>
                  {portfolios?.map((portfolio: any) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSync}
                disabled={!selectedPortfolio || syncMutation.isPending}
                className="btn-success"
                style={{ marginTop: '24px' }}
              >
                {syncMutation.isPending ? 'Syncing...' : 'Sync Positions'}
              </button>
            </div>
            <p className="text-sm text-secondary mt-md">
              This will import all positions from this Questrade account into the selected portfolio.
            </p>
            <div className="alert alert-warning mt-sm">
              ⚠️ Note: Dividends, ETF distributions, interest, and other income transactions are only synced for the last 365 days.
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-md">Positions in Account {selectedAccount}</h2>
          {positionsLoading ? (
            <div className="flex-center" style={{ padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : positions && positions.length > 0 ? (
            <table>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Symbol</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Avg Cost</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Current Price</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Market Value</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>P&L</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>% Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position: any, index: number) => {
                  const pnlPercent = position.averageEntryPrice > 0
                    ? ((position.currentPrice - position.averageEntryPrice) / position.averageEntryPrice * 100)
                    : 0;

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{position.symbol}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{position.openQuantity.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>${position.averageEntryPrice.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>${position.currentPrice.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>${position.currentMarketValue.toFixed(2)}</td>
                      <td
                        style={{
                          padding: '10px',
                          textAlign: 'right',
                          color: position.openPnL >= 0 ? 'green' : 'red',
                          fontWeight: 'bold',
                        }}
                      >
                        ${position.openPnL.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          textAlign: 'right',
                          color: pnlPercent >= 0 ? 'green' : 'red',
                          fontWeight: 'bold',
                        }}
                      >
                        {pnlPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No positions found in this account.
            </p>
          )}
        </>
      )}
    </div>
  );
}
