import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { RefreshCw, Search, Filter } from 'lucide-react';

const Transactions: React.FC = () => {
  const { state, processTransaction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showIgnored, setShowIgnored] = useState<boolean>(true);

  // Only show processed transactions
  const processedTransactions = useMemo(() => {
    return state.transactions.filter(
      (t) => t.isIgnored || t.categoryId || (t.splits && t.splits.length > 0)
    );
  }, [state.transactions]);

  const filteredTransactions = useMemo(() => {
    let result = [...processedTransactions];

    // Filter by Ignored
    if (!showIgnored) {
      result = result.filter(t => !t.isIgnored);
    }

    // Filter by Category
    if (filterCategory !== 'all') {
      result = result.filter(t => {
        if (filterCategory === 'ignored') return t.isIgnored;
        if (filterCategory === 'split') return t.splits && t.splits.length > 0;
        return t.categoryId === filterCategory || (t.splits && t.splits.some(s => s.categoryId === filterCategory));
      });
    }

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(lowerSearch) || 
        t.amount.toString().includes(lowerSearch)
      );
    }

    // Sort by Date (newest first)
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [processedTransactions, searchTerm, filterCategory, showIgnored]);

  const handleCategoryChange = (transactionId: string, newCategoryId: string) => {
    if (newCategoryId === 'requeue') {
      processTransaction(transactionId, null, false, undefined, false);
    } else if (newCategoryId === 'ignore') {
      processTransaction(transactionId, null, true, undefined, false);
    } else {
      processTransaction(transactionId, newCategoryId, false, undefined, false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Transactions History</h2>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto items-center">
          <div className="flex items-center">
            <Filter className="text-gray-400 w-5 h-5 mr-2" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="split">-- Split Transactions --</option>
              <option value="ignored">-- Ignored --</option>
              <optgroup label="Income">
                {state.categories.filter(c => c.type === 'income').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Cost">
                {state.categories.filter(c => c.type === 'cost').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap cursor-pointer">
            <input 
              type="checkbox" 
              checked={showIgnored} 
              onChange={(e) => setShowIgnored(e.target.checked)}
              className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
            />
            Show Ignored
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-sm font-semibold text-gray-600 whitespace-nowrap">Date</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Description</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600 text-right whitespace-nowrap">Amount</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">Category</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                    No processed transactions match your filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-50 ${t.isIgnored ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{t.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{t.description}</td>
                    <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${t.amount > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                      {t.amount.toFixed(2)} kr
                    </td>
                    <td className="px-6 py-4">
                      {t.splits && t.splits.length > 0 ? (
                        <div className="text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800 mb-1">
                            Split ({t.splits.length})
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {t.splits.map((s, i) => {
                              const cat = state.categories.find(c => c.id === s.categoryId);
                              return (
                                <div key={i}>{cat?.name || 'Unknown'}: {s.amount.toFixed(2)} kr</div>
                              );
                            })}
                            {(() => {
                              const totalAssigned = t.splits.reduce((sum, s) => sum + s.amount, 0);
                              const txTotal = Math.abs(t.amount);
                              const remainder = txTotal - totalAssigned;
                              if (remainder > 0.01) {
                                return (
                                  <div className="text-red-500 mt-0.5">Ignored: {remainder.toFixed(2)} kr</div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      ) : (
                        <select
                          value={t.isIgnored ? 'ignore' : (t.categoryId || '')}
                          onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                          className={`text-sm px-2 py-1 border rounded-md focus:ring-2 focus:ring-green-500 ${
                            t.isIgnored ? 'bg-gray-100 border-gray-300 text-gray-600' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="ignore">Ignored</option>
                          <optgroup label="Income">
                            {state.categories.filter(c => c.type === 'income').map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Cost">
                            {state.categories.filter(c => c.type === 'cost').map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleCategoryChange(t.id, 'requeue')}
                        title="Send back to Upload Queue"
                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition flex items-center inline-flex ml-auto text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4 mr-1.5" /> Re-queue
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
