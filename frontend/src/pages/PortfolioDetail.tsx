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
    return <div className="container"><p className="font-bold">Loading...</p></div>;
  }

  return (
    <div className="container">
      <Link to="/dashboard" className="mb-lg" style={{ display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <div className="flex-between mb-xl">
        <div>
          <div className="flex gap-md" style={{ alignItems: 'center', marginBottom: '8px' }}>
            <h1 className="page-title" style={{ fontSize: '36px', marginBottom: 0 }}>{portfolio?.name}</h1>
            {portfolio?.questrade_account_id && (
              <span className="badge badge-success">🔗 Questrade</span>
            )}
          </div>
          <p className="text-secondary">{portfolio?.description}</p>
          {portfolio?.last_questrade_sync && (
            <p className="text-sm text-secondary mt-sm">
              Last synced: {new Date(portfolio.last_questrade_sync).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-md">
          {portfolio?.questrade_account_id && (
            <button
              onClick={() => syncQuestradeMutation.mutate()}
              disabled={syncQuestradeMutation.isPending}
              className="btn-success"
            >
              {syncQuestradeMutation.isPending ? 'Syncing...' : '🔄 Sync Questrade'}
            </button>
          )}
          <button
            onClick={() => setShowAddTransaction(!showAddTransaction)}
            className="btn-primary"
          >
            {showAddTransaction ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>
      </div>

      {showAddTransaction && (
        <div className="card mb-xl">
          <h3 className="font-extrabold mb-md">Add Transaction</h3>
          <form onSubmit={handleSubmit}>
            <div className="transaction-form-grid">
              <div className="form-group">
                <label>Stock Symbol:</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, GOOGL, MSFT"
                  required
                />
              </div>
              <div className="form-group">
                <label>Transaction Type:</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="DIVIDEND">Dividend</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity:</label>
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
              <div className="form-group">
                <label>Price per Share:</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="150.50"
                  required
                />
              </div>
              <div className="form-group">
                <label>Currency:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'CAD' | 'USD')}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fees (optional):</label>
                <input
                  type="number"
                  step="0.01"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Transaction Date:</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes (optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this transaction..."
                rows={2}
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" disabled={addTransactionMutation.isPending} className="btn-primary">
              {addTransactionMutation.isPending ? 'Adding...' : 'Add Transaction'}
            </button>
          </form>
        </div>
      )}

      <div className="mt-xl">
        <div className="flex-between mb-lg">
          <h2 className="card-header" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Portfolio Summary</h2>
          <button
            onClick={() => aiAnalysisMutation.mutate()}
            disabled={aiAnalysisMutation.isPending}
            className="btn-ai"
          >
            {aiAnalysisMutation.isPending ? 'Analyzing...' : '🤖 Get AI Advice'}
          </button>
        </div>
        <div className="summary-grid">
          <div className="stats-card">
            <div className="stats-label">Total Value (with cash)</div>
            <div className="stats-value">
              ${portfolio?.total_value_with_cash ? parseFloat(portfolio.total_value_with_cash).toFixed(2) : '0.00'} <span className="text-sm text-secondary">CAD</span>
            </div>
            <div className="text-sm text-secondary mt-sm">
              Holdings: ${portfolio?.total_value ? parseFloat(portfolio.total_value).toFixed(2) : '0.00'}
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-label">Total Cost</div>
            <div className="stats-value">
              ${portfolio?.total_cost ? parseFloat(portfolio.total_cost).toFixed(2) : '0.00'} <span className="text-sm text-secondary">CAD</span>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-label">Gain/Loss</div>
            <div
              className="stats-value"
              style={{
                color: portfolio?.total_gain_loss >= 0 ? '#00C853' : '#FF0000',
              }}
            >
              ${portfolio?.total_gain_loss ? parseFloat(portfolio.total_gain_loss).toFixed(2) : '0.00'} <span className="text-sm text-secondary">CAD</span>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-label">Return %</div>
            <div
              className="stats-value"
              style={{
                color: portfolio?.total_gain_loss_percent >= 0 ? '#00C853' : '#FF0000',
              }}
            >
              {portfolio?.total_gain_loss_percent ? parseFloat(portfolio.total_gain_loss_percent).toFixed(2) : '0.00'}%
            </div>
          </div>
          <div className="stats-card bg-yellow">
            <div className="stats-label">Income (Last Year)</div>
            <div className="text-sm text-secondary mb-xs">Dividends, Distributions, Interest</div>
            <div className="stats-value text-success">
              ${dividendTotal.toFixed(2)}
            </div>
          </div>
          <div className="stats-card bg-cream" style={{ cursor: 'pointer' }} onClick={() => setShowEditCash(!showEditCash)}>
            <div className="flex-between stats-label">
              Cash Balance
              <span className="text-sm">✏️ Edit</span>
            </div>
            <div className="font-bold text-lg mt-sm">
              ${portfolio?.cash_balance_cad ? parseFloat(portfolio.cash_balance_cad).toFixed(2) : '0.00'} <span className="text-sm text-secondary">CAD</span>
            </div>
            <div className="font-bold text-lg mt-xs">
              ${portfolio?.cash_balance_usd ? parseFloat(portfolio.cash_balance_usd).toFixed(2) : '0.00'} <span className="text-sm text-secondary">USD</span>
            </div>
          </div>
        </div>

        {showEditCash && (
          <div className="card mt-lg border-thick" style={{ borderColor: '#FFA000' }}>
            <h3 className="font-extrabold mb-md">Edit Cash Balance</h3>
            <div className="transaction-form-grid">
              <div className="form-group">
                <label>CAD Cash:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashCAD}
                  onChange={(e) => setCashCAD(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>USD Cash:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashUSD}
                  onChange={(e) => setCashUSD(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-md mt-md">
              <button
                onClick={handleUpdateCash}
                disabled={updateCashMutation.isPending}
                className="btn-success"
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
          <table className="mt-md">
            <thead>
              <tr>
                <th>Symbol</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Avg Cost</th>
                <th style={{ textAlign: 'right' }}>Current Price</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th style={{ textAlign: 'right' }}>Gain/Loss</th>
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
            <table className="mt-md">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Symbol</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Currency</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
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
