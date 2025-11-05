import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { portfolioAPI, transactionAPI } from '../services/api';
import { useState } from 'react';

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const portfolioId = parseInt(id || '0');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL' | 'DIVIDEND'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const response = await portfolioAPI.getById(portfolioId);
      return response.data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: async () => {
      const response = await transactionAPI.getByPortfolio(portfolioId);
      return response.data;
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: (data: any) => transactionAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      setShowAddTransaction(false);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to add transaction');
    },
  });

  const resetForm = () => {
    setSymbol('');
    setTransactionType('BUY');
    setQuantity('');
    setPrice('');
    setFees('0');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !quantity || !price) {
      setError('Symbol, quantity, and price are required');
      return;
    }

    addTransactionMutation.mutate({
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      transaction_type: transactionType,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      fees: parseFloat(fees) || 0,
      transaction_date: new Date(transactionDate).toISOString(),
      notes: notes || undefined,
    });
  };

  if (portfolioLoading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Link to="/dashboard" style={{ marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{portfolio?.name}</h1>
          <p style={{ color: '#666' }}>{portfolio?.description}</p>
        </div>
        <button
          onClick={() => setShowAddTransaction(!showAddTransaction)}
          style={{ backgroundColor: '#007bff', padding: '10px 20px' }}
        >
          {showAddTransaction ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {showAddTransaction && (
        <div style={{
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginTop: '20px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>Add Transaction</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Stock Symbol:</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, GOOGL, MSFT"
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label>Transaction Type:</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="DIVIDEND">Dividend</option>
                </select>
              </div>
              <div>
                <label>Quantity:</label>
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="10"
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label>Price per Share:</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="150.50"
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label>Fees (optional):</label>
                <input
                  type="number"
                  step="0.01"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label>Transaction Date:</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label>Notes (optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this transaction..."
                rows={2}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
            <div style={{ marginTop: '15px' }}>
              <button type="submit" disabled={addTransactionMutation.isPending}>
                {addTransactionMutation.isPending ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Portfolio Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '15px' }}>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Value</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              ${portfolio?.total_value ? parseFloat(portfolio.total_value).toFixed(2) : '0.00'}
            </div>
          </div>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Cost</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              ${portfolio?.total_cost ? parseFloat(portfolio.total_cost).toFixed(2) : '0.00'}
            </div>
          </div>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Gain/Loss</div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: portfolio?.total_gain_loss >= 0 ? 'green' : 'red',
              }}
            >
              ${portfolio?.total_gain_loss ? parseFloat(portfolio.total_gain_loss).toFixed(2) : '0.00'}
            </div>
          </div>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Return %</div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: portfolio?.total_gain_loss_percent >= 0 ? 'green' : 'red',
              }}
            >
              {portfolio?.total_gain_loss_percent ? parseFloat(portfolio.total_gain_loss_percent).toFixed(2) : '0.00'}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Holdings</h2>
        {portfolio?.holdings && portfolio.holdings.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Symbol</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Avg Cost</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Current Price</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Value</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((holding: any) => (
                <tr key={holding.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{holding.symbol}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(holding.quantity).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>${parseFloat(holding.average_cost).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    ${holding.current_price ? parseFloat(holding.current_price).toFixed(2) : '-'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    ${holding.current_value ? parseFloat(holding.current_value).toFixed(2) : '-'}
                  </td>
                  <td
                    style={{
                      padding: '10px',
                      textAlign: 'right',
                      color: holding.unrealized_gain_loss >= 0 ? 'green' : 'red',
                      fontWeight: 'bold',
                    }}
                  >
                    ${holding.unrealized_gain_loss ? parseFloat(holding.unrealized_gain_loss).toFixed(2) : '-'}
                    {holding.unrealized_gain_loss_percent && (
                      <span> ({parseFloat(holding.unrealized_gain_loss_percent).toFixed(2)}%)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No holdings yet. Add your first transaction to get started!
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Recent Transactions</h2>
        {transactions && transactions.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Symbol</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((txn: any) => (
                <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: txn.transaction_type === 'BUY' ? '#d4edda' : txn.transaction_type === 'SELL' ? '#f8d7da' : '#d1ecf1',
                      color: txn.transaction_type === 'BUY' ? '#155724' : txn.transaction_type === 'SELL' ? '#721c24' : '#0c5460'
                    }}>
                      {txn.transaction_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{txn.symbol}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(txn.quantity).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>${parseFloat(txn.price).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                    ${parseFloat(txn.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No transactions yet.
          </p>
        )}
      </div>
    </div>
  );
}
