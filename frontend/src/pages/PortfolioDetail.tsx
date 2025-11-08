import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { portfolioAPI, transactionAPI, aiAdvisorAPI } from '../services/api';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/markdown.css';

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const portfolioId = parseInt(id || '0');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL' | 'DIVIDEND'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'CAD' | 'USD'>('CAD');
  const [fees, setFees] = useState('0');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 20;
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [showEditCash, setShowEditCash] = useState(false);
  const [cashCAD, setCashCAD] = useState('0');
  const [cashUSD, setCashUSD] = useState('0');
  const queryClient = useQueryClient();

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const response = await portfolioAPI.getById(portfolioId);
      const data = response.data;
      // Set cash values when portfolio loads
      setCashCAD(data.cash_balance_cad?.toString() || '0');
      setCashUSD(data.cash_balance_usd?.toString() || '0');
      return data;
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

  const aiAnalysisMutation = useMutation({
    mutationFn: () => aiAdvisorAPI.analyzePortfolio(portfolioId),
    onSuccess: (response: any) => {
      setAiAnalysis(response.data.analysis);
      setShowAIAnalysis(true);
    },
    onError: (err: any) => {
      setAiAnalysis(err.response?.data?.detail || 'Failed to generate AI analysis. Please make sure your OpenAI API key is configured.');
      setShowAIAnalysis(true);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (transactionId: number) => transactionAPI.delete(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', portfolioId] });
    },
  });

  const syncQuestradeMutation = useMutation({
    mutationFn: () => portfolioAPI.syncQuestrade(portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', portfolioId] });
      alert('Portfolio synced successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to sync portfolio');
    },
  });

  const syncHoldingsMutation = useMutation({
    mutationFn: () => portfolioAPI.syncHoldings(portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', portfolioId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to sync holdings');
    },
  });

  const updateCashMutation = useMutation({
    mutationFn: (data: { cash_balance_cad: number; cash_balance_usd: number }) =>
      portfolioAPI.update(portfolioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolioId] });
      setShowEditCash(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to update cash balance');
    },
  });

  const handleUpdateCash = () => {
    updateCashMutation.mutate({
      cash_balance_cad: parseFloat(cashCAD) || 0,
      cash_balance_usd: parseFloat(cashUSD) || 0,
    });
  };

  const handleDeleteTransaction = (transactionId: number, symbol: string, type: string) => {
    if (window.confirm(`Are you sure you want to delete this ${type} transaction for ${symbol}?`)) {
      deleteTransactionMutation.mutate(transactionId);
    }
  };

  const resetForm = () => {
    setSymbol('');
    setTransactionType('BUY');
    setQuantity('');
    setPrice('');
    setCurrency('CAD');
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
      currency: currency,
      fees: parseFloat(fees) || 0,
      transaction_date: new Date(transactionDate).toISOString(),
      notes: notes || undefined,
    });
  };

  // Calculate dividend total from last year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dividendTotal = transactions
    ?.filter((txn: any) =>
      txn.transaction_type === 'DIVIDEND' &&
      new Date(txn.transaction_date) >= oneYearAgo
    )
    .reduce((sum: number, txn: any) => sum + parseFloat(txn.total_amount), 0) || 0;

  // Pagination calculations
  const totalPages = Math.ceil((transactions?.length || 0) / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const paginatedTransactions = transactions?.slice(startIndex, endIndex) || [];

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>{portfolio?.name}</h1>
            {portfolio?.questrade_account_id && (
              <span className="badge badge-success">🔗 Questrade</span>
            )}
          </div>
          <p style={{ color: '#666' }}>{portfolio?.description}</p>
          {portfolio?.last_questrade_sync && (
            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
              Last synced: {new Date(portfolio.last_questrade_sync).toLocaleString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {portfolio?.questrade_account_id && (
            <button
              onClick={() => syncQuestradeMutation.mutate()}
              disabled={syncQuestradeMutation.isPending}
              className="btn-success"
              style={{ padding: '10px 20px' }}
            >
              {syncQuestradeMutation.isPending ? 'Syncing...' : '🔄 Sync Questrade'}
            </button>
          )}
          <button
            onClick={() => setShowAddTransaction(!showAddTransaction)}
            style={{ backgroundColor: '#007bff', padding: '10px 20px' }}
          >
            {showAddTransaction ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>
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
                <label>Currency:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'CAD' | 'USD')}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Portfolio Summary</h2>
          <button
            onClick={() => aiAnalysisMutation.mutate()}
            disabled={aiAnalysisMutation.isPending}
            style={{ backgroundColor: '#6f42c1', padding: '10px 20px', color: 'white' }}
          >
            {aiAnalysisMutation.isPending ? 'Analyzing...' : '🤖 Get AI Advice'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Value (with cash)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              ${portfolio?.total_value_with_cash ? parseFloat(portfolio.total_value_with_cash).toFixed(2) : '0.00'} <span style={{ fontSize: '14px', color: '#999' }}>CAD</span>
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              Holdings: ${portfolio?.total_value ? parseFloat(portfolio.total_value).toFixed(2) : '0.00'}
            </div>
          </div>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Cost</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              ${portfolio?.total_cost ? parseFloat(portfolio.total_cost).toFixed(2) : '0.00'} <span style={{ fontSize: '14px', color: '#999' }}>CAD</span>
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
              ${portfolio?.total_gain_loss ? parseFloat(portfolio.total_gain_loss).toFixed(2) : '0.00'} <span style={{ fontSize: '14px', color: '#999' }}>CAD</span>
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
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#e7f3ff' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Income (Last Year)</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>Dividends, Distributions, Interest</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              ${dividendTotal.toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff8e1', cursor: 'pointer' }} onClick={() => setShowEditCash(!showEditCash)}>
            <div style={{ fontSize: '14px', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Cash Balance
              <span style={{ fontSize: '12px' }}>✏️ Edit</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginTop: '8px' }}>
              ${portfolio?.cash_balance_cad ? parseFloat(portfolio.cash_balance_cad).toFixed(2) : '0.00'} <span style={{ fontSize: '12px', color: '#999' }}>CAD</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
              ${portfolio?.cash_balance_usd ? parseFloat(portfolio.cash_balance_usd).toFixed(2) : '0.00'} <span style={{ fontSize: '12px', color: '#999' }}>USD</span>
            </div>
          </div>
        </div>

        {showEditCash && (
          <div style={{
            padding: '20px',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            marginTop: '20px',
            backgroundColor: '#fffbf0'
          }}>
            <h3 style={{ marginTop: 0 }}>Edit Cash Balance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>CAD Cash:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashCAD}
                  onChange={(e) => setCashCAD(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div>
                <label>USD Cash:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashUSD}
                  onChange={(e) => setCashUSD(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button
                onClick={handleUpdateCash}
                disabled={updateCashMutation.isPending}
                style={{ backgroundColor: '#28a745', padding: '10px 20px' }}
              >
                {updateCashMutation.isPending ? 'Saving...' : 'Save Cash Balance'}
              </button>
              <button
                onClick={() => setShowEditCash(false)}
                style={{ backgroundColor: '#6c757d', padding: '10px 20px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {showAIAnalysis && aiAnalysis && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          border: '2px solid #6f42c1',
          borderRadius: '8px',
          backgroundColor: '#f8f5ff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0 }}>🤖 AI Portfolio Analysis</h2>
            <button
              onClick={() => setShowAIAnalysis(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0 10px'
              }}
            >
              ×
            </button>
          </div>
          <div style={{
            lineHeight: '1.6',
            fontSize: '15px',
            color: '#333'
          }}
          className="ai-analysis-markdown">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

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
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>{holding.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{holding.currency}</div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(holding.quantity).toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    ${parseFloat(holding.average_cost).toFixed(2)} <span style={{ fontSize: '11px', color: '#999' }}>{holding.currency}</span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {holding.current_price ? `$${parseFloat(holding.current_price).toFixed(2)}` : '-'} {holding.current_price && <span style={{ fontSize: '11px', color: '#999' }}>{holding.currency}</span>}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {holding.current_value ? `$${parseFloat(holding.current_value).toFixed(2)}` : '-'} {holding.current_value && <span style={{ fontSize: '11px', color: '#999' }}>{holding.currency}</span>}
                  </td>
                  <td
                    style={{
                      padding: '10px',
                      textAlign: 'right',
                      color: holding.unrealized_gain_loss >= 0 ? 'green' : 'red',
                      fontWeight: 'bold',
                    }}
                  >
                    {holding.unrealized_gain_loss ? `$${parseFloat(holding.unrealized_gain_loss).toFixed(2)}` : '-'}
                    {holding.unrealized_gain_loss_percent && (
                      <span> ({parseFloat(holding.unrealized_gain_loss_percent).toFixed(2)}%)</span>
                    )}
                    {holding.unrealized_gain_loss && <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}> {holding.currency}</span>}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>All Transactions ({transactions?.length || 0})</h2>
          {totalPages > 1 && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
        {transactions && transactions.length > 0 ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Symbol</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Currency</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((txn: any) => {
                  // Determine display label for transaction type
                  let displayType = txn.transaction_type;
                  if (txn.transaction_type === 'DIVIDEND' && txn.notes) {
                    if (txn.notes.startsWith('ETF Distribution:')) {
                      displayType = 'ETF DIST';
                    } else if (txn.notes.startsWith('Interest:')) {
                      displayType = 'INTEREST';
                    } else if (txn.notes.includes('Distribution:')) {
                      displayType = 'DISTRIBUTION';
                    } else if (txn.notes.startsWith('Dividend:')) {
                      displayType = 'DIVIDEND';
                    }
                  }

                  return (
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
                          {displayType}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{txn.symbol}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(txn.quantity).toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>${parseFloat(txn.price).toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          backgroundColor: txn.currency === 'USD' ? '#fff3cd' : '#d4edda',
                          color: txn.currency === 'USD' ? '#856404' : '#155724'
                        }}>
                          {txn.currency || 'CAD'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                        ${parseFloat(txn.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteTransaction(txn.id, txn.symbol, displayType)}
                          className="btn-danger"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            opacity: deleteTransactionMutation.isPending ? 0.5 : 1
                          }}
                          disabled={deleteTransactionMutation.isPending}
                          title="Delete transaction"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{ padding: '8px 12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ padding: '8px 12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span style={{ padding: '8px 12px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ padding: '8px 12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{ padding: '8px 12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Last
                </button>
              </div>
            )}
          </>
        ) : (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No transactions yet.
          </p>
        )}
      </div>
    </div>
  );
}
