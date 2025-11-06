import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { questradeAPI, portfolioAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function QuestradePositions() {
  const { user } = useAuth();
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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Link to="/dashboard" style={{ marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <h1>Questrade Positions</h1>

      {syncMessage && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: syncMessage.includes('Success') ? '#d4edda' : '#f8d7da',
          color: syncMessage.includes('Success') ? '#155724' : '#721c24',
          borderRadius: '8px',
        }}>
          {syncMessage}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2>Select Account</h2>
        {accountsError && (
          <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>
            <strong>Questrade Connection Expired</strong>
            <p style={{ marginTop: '10px', marginBottom: '10px' }}>
              Your Questrade access token has expired. Questrade tokens expire after 30 minutes.
            </p>
            <p style={{ marginBottom: '10px' }}>
              To reconnect:
            </p>
            <ol style={{ marginLeft: '20px', marginBottom: '10px' }}>
              <li>Go back to the <Link to="/dashboard" style={{ color: '#721c24', fontWeight: 'bold' }}>Dashboard</Link></li>
              <li>Click "Disconnect" in the Questrade section</li>
              <li>Get a new refresh token from <a href="https://www.questrade.com/api" target="_blank" rel="noopener noreferrer" style={{ color: '#721c24', fontWeight: 'bold' }}>Questrade API Portal</a></li>
              <li>Click "Connect with Refresh Token" and enter your new token</li>
            </ol>
          </div>
        )}
        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {accounts?.map((account: any) => (
            <div
              key={account.number}
              onClick={() => setSelectedAccount(account.number)}
              style={{
                padding: '15px',
                border: selectedAccount === account.number ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedAccount === account.number ? '#e7f3ff' : '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{account.type}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Account: {account.number}</div>
              <div style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>{account.status}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedAccount && (
        <>
          {balancesError && (
            <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>
              Error loading balances: {(balancesError as any)?.message || 'Unknown error'}
            </div>
          )}
          {positionsError && (
            <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>
              Error loading positions: {(positionsError as any)?.message || 'Unknown error'}
            </div>
          )}
          {balances && balances.length > 0 && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0 }}>Account Balances</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {balances.map((balance: any, index: number) => (
                  <div key={index} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>{balance.currency}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Cash: ${balance.cash.toFixed(2)}</div>
                    <div style={{ fontSize: '14px' }}>Market Value: ${balance.marketValue.toFixed(2)}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '5px', color: '#007bff' }}>
                      Total Equity: ${balance.totalEquity.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Sync to Portfolio</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedPortfolio || ''}
                onChange={(e) => setSelectedPortfolio(Number(e.target.value))}
                style={{ padding: '8px', flex: 1, maxWidth: '300px' }}
              >
                <option value="">Select a portfolio...</option>
                {portfolios?.map((portfolio: any) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSync}
                disabled={!selectedPortfolio || syncMutation.isPending}
                style={{ backgroundColor: '#28a745', padding: '8px 20px' }}
              >
                {syncMutation.isPending ? 'Syncing...' : 'Sync Positions'}
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              This will import all positions from this Questrade account into the selected portfolio.
            </p>
            <p style={{ fontSize: '13px', color: '#856404', marginTop: '5px', backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px' }}>
              ⚠️ Note: Dividends, ETF distributions, interest, and other income transactions are only synced for the last 365 days.
            </p>
          </div>

          <h2>Positions in Account {selectedAccount}</h2>
          {positionsLoading ? (
            <p>Loading positions...</p>
          ) : positions && positions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
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
