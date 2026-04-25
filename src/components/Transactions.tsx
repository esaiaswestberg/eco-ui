import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { useStore } from '../store';
import { RefreshCw, Search, Filter, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { MatchType } from '../types';

interface DescriptionRule {
  id: string;
  type: MatchType;
  value: string;
}

const matchTypeLabel: Record<MatchType, string> = {
  exact: 'Exact',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  not_exact: 'Does not equal',
  not_contains: 'Does not contain',
  not_starts_with: 'Does not start with',
  not_ends_with: 'Does not end with'
};

const Transactions: React.FC = () => {
  const { state, processTransaction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showIgnored, setShowIgnored] = useState<boolean>(true);
  
  // Advanced Filters State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<{value: string, label: string}[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<number | ''>('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [descriptionRules, setDescriptionRules] = useState<DescriptionRule[]>([]);
  
  // Description rule inputs
  const [newRuleType, setNewRuleType] = useState<MatchType>('contains');
  const [newRuleValue, setNewRuleValue] = useState('');

  // Category Options for React-Select
  const categoryOptions = useMemo(() => {
    const options = [
      { value: 'split', label: '-- Split Transactions --' },
      { value: 'ignored', label: '-- Ignored --' }
    ];
    
    state.categories.filter(c => c.type === 'income').forEach(c => {
      options.push({ value: c.id, label: `Income: ${c.name}` });
    });
    
    state.categories.filter(c => c.type === 'cost').forEach(c => {
      options.push({ value: c.id, label: `Cost: ${c.name}` });
    });
    
    return options;
  }, [state.categories]);

  const handleAddDescriptionRule = () => {
    if (!newRuleValue.trim()) return;
    setDescriptionRules([
      ...descriptionRules, 
      { id: Date.now().toString(), type: newRuleType, value: newRuleValue.trim() }
    ]);
    setNewRuleValue('');
  };

  const removeDescriptionRule = (id: string) => {
    setDescriptionRules(descriptionRules.filter(r => r.id !== id));
  };

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

    // Filter by Multi-Category
    if (selectedCategories.length > 0) {
      const selectedIds = selectedCategories.map(c => c.value);
      result = result.filter(t => {
        if (selectedIds.includes('ignored') && t.isIgnored) return true;
        if (selectedIds.includes('split') && t.splits && t.splits.length > 0) return true;
        
        if (t.categoryId && selectedIds.includes(t.categoryId)) return true;
        if (t.splits && t.splits.some(s => selectedIds.includes(s.categoryId))) return true;
        
        return false;
      });
    }

    // Date Range Filter
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(t => new Date(t.date).getTime() >= start);
    }
    if (endDate) {
      // Add 1 day to include the whole end date
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      result = result.filter(t => new Date(t.date).getTime() < end.getTime());
    }

    // Amount Range Filter (Absolute)
    if (minAmount !== '') {
      result = result.filter(t => Math.abs(t.amount) >= Number(minAmount));
    }
    if (maxAmount !== '') {
      result = result.filter(t => Math.abs(t.amount) <= Number(maxAmount));
    }

    // Description Rules Filter
    if (descriptionRules.length > 0) {
      result = result.filter(t => {
        const desc = t.description.toLowerCase();
        return descriptionRules.every(rule => {
          const ruleVal = rule.value.toLowerCase();
          switch (rule.type) {
            case 'exact': return desc === ruleVal;
            case 'contains': return desc.includes(ruleVal);
            case 'starts_with': return desc.startsWith(ruleVal);
            case 'ends_with': return desc.endsWith(ruleVal);
            case 'not_exact': return desc !== ruleVal;
            case 'not_contains': return !desc.includes(ruleVal);
            case 'not_starts_with': return !desc.startsWith(ruleVal);
            case 'not_ends_with': return !desc.endsWith(ruleVal);
            default: return true;
          }
        });
      });
    }

    // Search (Main Search Bar)
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
  }, [processedTransactions, searchTerm, selectedCategories, showIgnored, startDate, endDate, minAmount, maxAmount, descriptionRules]);

  // Calculate Statistics
  const statistics = useMemo(() => {
    if (filteredTransactions.length === 0) return null;

    let totalIncome = 0;
    let totalCost = 0;

    filteredTransactions.forEach(t => {
      // Exclude ignored transactions from totals unless explicitly filtering for them maybe?
      // Usually, totals shouldn't include ignored ones.
      if (!t.isIgnored) {
         if (t.amount > 0) totalIncome += t.amount;
         if (t.amount < 0) totalCost += t.amount;
      }
    });

    const dates = filteredTransactions.map(t => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    const timespanMs = maxDate - minDate;
    const timespanDays = Math.max(1, timespanMs / (1000 * 60 * 60 * 24)); // At least 1 day
    const timespanWeeks = Math.max(1, timespanDays / 7);
    const timespanMonths = Math.max(1, timespanDays / 30.44); // Approx days in month

    return {
      totalIncome,
      totalCost,
      avgIncomePerWeek: totalIncome / timespanWeeks,
      avgCostPerWeek: totalCost / timespanWeeks,
      avgIncomePerMonth: totalIncome / timespanMonths,
      avgCostPerMonth: totalCost / timespanMonths,
      days: timespanDays
    };
  }, [filteredTransactions]);

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
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search descriptions or amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto items-center">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-green-500 transition"
            >
              <Filter className="w-5 h-5" />
              Advanced Filters
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
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

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Categories */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 z-20">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
              <Select
                isMulti
                options={categoryOptions}
                value={selectedCategories}
                onChange={(newValue) => setSelectedCategories(newValue as any)}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select categories to filter by..."
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Date Range</h3>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Absolute Amount Range</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Description Rules */}
            <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-3">
               <h3 className="text-sm font-medium text-gray-700">Description Matches</h3>
               <div className="flex items-center gap-2">
                 <select
                    value={newRuleType}
                    onChange={(e) => setNewRuleType(e.target.value as MatchType)}
                    className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="exact">Exact</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                    <option value="not_exact">Does Not Equal</option>
                    <option value="not_contains">Does Not Contain</option>
                    <option value="not_starts_with">Does Not Start With</option>
                    <option value="not_ends_with">Does Not End With</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDescriptionRule()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                  <button 
                    onClick={handleAddDescriptionRule}
                    className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
               </div>
               {/* Active Rules List */}
               {descriptionRules.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-2">
                    {descriptionRules.map((rule) => (
                      <span key={rule.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        <span className="text-gray-500">{matchTypeLabel[rule.type]}:</span> {rule.value}
                        <button onClick={() => removeDescriptionRule(rule.id)} className="text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                   ))}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 mb-6">
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
      {/* Statistics */}
      {statistics && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <div className="p-4 bg-green-50 rounded-lg border border-green-100">
             <div className="text-sm text-green-800 font-medium mb-1">Total Income</div>
             <div className="text-2xl font-bold text-green-600">{statistics.totalIncome.toFixed(2)} kr</div>
             <div className="text-xs text-green-700 mt-2">
               {statistics.avgIncomePerMonth.toFixed(0)} kr / mo • {statistics.avgIncomePerWeek.toFixed(0)} kr / wk
             </div>
           </div>
           
           <div className="p-4 bg-red-50 rounded-lg border border-red-100">
             <div className="text-sm text-red-800 font-medium mb-1">Total Costs</div>
             <div className="text-2xl font-bold text-red-600">{Math.abs(statistics.totalCost).toFixed(2)} kr</div>
             <div className="text-xs text-red-700 mt-2">
               {Math.abs(statistics.avgCostPerMonth).toFixed(0)} kr / mo • {Math.abs(statistics.avgCostPerWeek).toFixed(0)} kr / wk
             </div>
           </div>

           <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
             <div className="text-sm text-blue-800 font-medium mb-1">Net Flow</div>
             <div className={`text-2xl font-bold ${(statistics.totalIncome + statistics.totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
               {(statistics.totalIncome + statistics.totalCost).toFixed(2)} kr
             </div>
             <div className="text-xs text-blue-700 mt-2">
               In selected {statistics.days.toFixed(0)} days
             </div>
           </div>

           <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-center items-center text-center">
             <div className="text-sm text-gray-500 mb-1">Transactions Shown</div>
             <div className="text-3xl font-bold text-gray-700">{filteredTransactions.length}</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
