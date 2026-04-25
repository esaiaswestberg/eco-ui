import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import type { Transaction } from '../types';
import Papa from 'papaparse';
import { UploadCloud, SkipForward, FileText, Trash2, Undo, Plus, Settings, Sliders } from 'lucide-react';
import type { MatchType } from '../types';

const generateId = (row: any) => {
  // Transaktionsdag, Beskrivning, Belopp, Bokfört saldo
  const date = row['Transaktionsdag'] || '';
  const desc = (row['Beskrivning'] || '').replace(/\s/g, '');
  const amount = row['Belopp'] || '';
  const balance = row['Bokfrt saldo'] || row['Bokfört saldo'] || '';
  return btoa(encodeURIComponent(`${date}_${desc}_${amount}_${balance}`));
};

const Upload: React.FC = () => {
  const { state, addTransactions, processTransaction } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [queue, setQueue] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [splits, setSplits] = useState<{ categoryId: string; amount: number }[]>([
    { categoryId: '', amount: 0 },
    { categoryId: '', amount: 0 }
  ]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleMatch, setRuleMatch] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<MatchType>('exact');
  const [ruleMinAmount, setRuleMinAmount] = useState<string>('');
  const [ruleMaxAmount, setRuleMaxAmount] = useState<string>('');
  const [ruleAction, setRuleAction] = useState<'categorize' | 'ignore'>('categorize');
  const [ruleCategory, setRuleCategory] = useState<string>('');

  const { addRule } = useStore();

  const openRuleModal = () => {
    if (!queue.length) return;
    const currentTx = queue[0];
    setRuleMatch(currentTx.description);
    setRuleMatchType('exact');
    setRuleMinAmount('');
    setRuleMaxAmount('');
    setRuleAction('categorize');
    setRuleCategory('');
    setShowRuleModal(true);
  };

  const handleSaveRule = () => {
    if (!ruleMatch.trim()) return;
    if (ruleAction === 'categorize' && !ruleCategory) return;

    addRule({
      descriptionMatch: ruleMatch.trim(),
      matchType: ruleMatchType,
      action: ruleAction,
      ...(ruleMinAmount && { minAmount: parseFloat(ruleMinAmount) }),
      ...(ruleMaxAmount && { maxAmount: parseFloat(ruleMaxAmount) }),
      ...(ruleAction === 'categorize' && { categoryId: ruleCategory })
    });
    setShowRuleModal(false);
    
    // The rule will automatically be applied by the store to pending transactions,
    // so we don't strictly need to do it here, but we may need to refresh the local queue.
    // However, store `addRule` updates `state.transactions`, which will trigger `loadPendingQueue`.
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target?.result as string;
      if (content.startsWith('* Transaktioner')) {
        content = content.substring(content.indexOf('\n') + 1);
      }

      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const existingIds = new Set(state.transactions.map((t) => t.id));
          
          const newTransactions: Transaction[] = [];
          
          for (const row of results.data as any[]) {
            const id = generateId(row);
            if (!existingIds.has(id)) {
              newTransactions.push({
                id,
                date: row['Transaktionsdag'] || row['Bokföringsdag'],
                description: row['Beskrivning'] || row['Referens'] || 'Unknown',
                amount: parseFloat(row['Belopp']?.replace(',', '.') || '0'),
                balance: parseFloat((row['Bokfrt saldo'] || row['Bokfört saldo'])?.replace(',', '.') || '0'),
                isIgnored: false,
                categoryId: null,
              });
            }
          }

          addTransactions(newTransactions);
          
          const pending = [...state.transactions, ...newTransactions].filter(
            (t) => !t.isIgnored && !t.categoryId && (!t.splits || t.splits.length === 0)
          );
          
          const sortedPending = [...pending].sort((a, b) => {
            if (a.isSkipped && !b.isSkipped) return 1;
            if (!a.isSkipped && b.isSkipped) return -1;
            return 0;
          });
          
          setQueue(sortedPending);
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        error: () => {
          alert('Error parsing CSV file');
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    };
    reader.readAsText(file, 'ISO-8859-1'); // Swedish characters
  };

  const handleProcess = (action: 'save' | 'ignore' | 'requeue', categoryId?: string, customSplits?: { categoryId: string; amount: number }[]) => {
    if (queue.length === 0) return;
    const current = queue[0];
    
    if (action === 'save') {
      if (customSplits) {
        processTransaction(current.id, null, false, customSplits, false);
      } else if (categoryId) {
        processTransaction(current.id, categoryId, false, undefined, false);
      } else {
        return;
      }
      setActionHistory((prev) => [...prev, current.id]);
      setQueue((prev) => prev.slice(1));
      setIsAdvanced(false);
      resetSplits();
    } else if (action === 'ignore') {
      processTransaction(current.id, null, true, undefined, false);
      setActionHistory((prev) => [...prev, current.id]);
      setQueue((prev) => prev.slice(1));
      setIsAdvanced(false);
      resetSplits();
    } else if (action === 'requeue') {
      processTransaction(current.id, null, false, undefined, true);
      setQueue((prev) => [...prev.slice(1), prev[0]]);
      setIsAdvanced(false);
      resetSplits();
    }
  };

  const resetSplits = () => {
    setSplits([
      { categoryId: '', amount: 0 },
      { categoryId: '', amount: 0 }
    ]);
  };

  const handleUndo = () => {
    if (actionHistory.length === 0) return;
    const lastId = actionHistory[actionHistory.length - 1];
    const txToUndo = state.transactions.find(t => t.id === lastId);
    if (txToUndo) {
      processTransaction(lastId, null, false, undefined, false);
      setActionHistory((prev) => prev.slice(0, -1));
      setQueue((prev) => [{...txToUndo, categoryId: null, isIgnored: false, isSkipped: false}, ...prev]);
    }
  };

  const loadPendingQueue = () => {
    const globalPending = state.transactions.filter(
      (t) => !t.isIgnored && !t.categoryId && (!t.splits || t.splits.length === 0)
    );
    if (globalPending.length > 0) {
      const sortedPending = [...globalPending].sort((a, b) => {
        if (a.isSkipped && !b.isSkipped) return 1;
        if (!a.isSkipped && b.isSkipped) return -1;
        return 0;
      });
      setQueue(sortedPending);
    } else {
      alert('No pending transactions to process.');
    }
  };

  React.useEffect(() => {
    setQueue((prevQueue) => {
      // Do not auto-load the queue if it's currently empty
      if (prevQueue.length === 0) return prevQueue;

      const stillPending = prevQueue.filter((qTx) => {
        const globalTx = state.transactions.find((t) => t.id === qTx.id);
        return globalTx && !globalTx.isIgnored && !globalTx.categoryId && (!globalTx.splits || globalTx.splits.length === 0);
      });

      if (stillPending.length === prevQueue.length) {
        return prevQueue;
      }

      return stillPending;
    });
  }, [state.transactions]);

  const currentTx = queue.length > 0 ? queue[0] : null;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Upload & Process</h2>

      {queue.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-10 flex flex-col items-center justify-center text-center">
          <FileText className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-2xl font-semibold text-gray-700 mb-2">Upload Bank Export</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Select a CSV file exported from your bank. Duplicates will be automatically ignored.
          </p>
          
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
            >
              <UploadCloud className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : 'Select CSV File'}
            </button>
            <button
              onClick={loadPendingQueue}
              className="flex items-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              Check Pending
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Process Transaction</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={openRuleModal}
                className="flex items-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition font-medium"
              >
                <Sliders className="w-4 h-4 mr-1.5" />
                Create Rule
              </button>
              <span className="bg-green-100 text-green-800 font-semibold px-4 py-1 rounded-full">
                {queue.length} Remaining
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-500 block">Date</span>
                <span className="font-semibold text-gray-800 text-lg">{currentTx?.date}</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500 block">Amount</span>
                <span className={`font-bold text-2xl ${currentTx && currentTx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {currentTx?.amount.toFixed(2)} kr
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500 block">Description</span>
              <span className="font-medium text-gray-800 text-xl">{currentTx?.description}</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">Select Category</label>
              <button
                onClick={() => setIsAdvanced(!isAdvanced)}
                className="text-sm flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <Settings className="w-4 h-4 mr-1" />
                {isAdvanced ? 'Basic Mode' : 'Advanced (Split)'}
              </button>
            </div>

            {isAdvanced ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Split Transaction</h4>
                <div className="space-y-3 mb-4">
                  {splits.map((split, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select
                        value={split.categoryId}
                        onChange={(e) => {
                          const newSplits = [...splits];
                          newSplits[index].categoryId = e.target.value;
                          setSplits(newSplits);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                      >
                        <option value="">-- Category --</option>
                        {state.categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={split.amount || ''}
                        onChange={(e) => {
                          const newSplits = [...splits];
                          newSplits[index].amount = parseFloat(e.target.value) || 0;
                          setSplits(newSplits);
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Amount"
                      />
                      <button
                        onClick={() => {
                          const newSplits = splits.filter((_, i) => i !== index);
                          setSplits(newSplits);
                        }}
                        disabled={splits.length <= 1}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <button
                    onClick={() => setSplits([...splits, { categoryId: '', amount: 0 }])}
                    className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Row
                  </button>
                  
                  {(() => {
                    const totalAssigned = splits.reduce((sum, s) => sum + s.amount, 0);
                    const txTotal = currentTx ? Math.abs(currentTx.amount) : 0;
                    const remainder = txTotal - totalAssigned;
                    const isValid = splits.every(s => s.categoryId) && totalAssigned <= txTotal + 0.01;
                    return (
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-600">
                          Assigned: <span className={totalAssigned <= txTotal + 0.01 ? 'text-green-600' : 'text-red-600'}>{totalAssigned.toFixed(2)}</span> 
                          {' '}| Ignored: {remainder > 0.01 ? remainder.toFixed(2) : '0.00'} 
                          {' '}| Total: {txTotal.toFixed(2)} kr
                        </span>
                        <button
                          onClick={() => handleProcess('save', undefined, splits)}
                          disabled={!isValid}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        >
                          Save Splits
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {(!currentTx || currentTx.amount <= 0) && (
                  <div className={currentTx && currentTx.amount < 0 ? 'col-span-2' : ''}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cost Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {state.categories.filter(c => c.type === 'cost').map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleProcess('save', c.id)}
                          className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(!currentTx || currentTx.amount >= 0) && (
                  <div className={currentTx && currentTx.amount > 0 ? 'col-span-2' : ''}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Income Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {state.categories.filter(c => c.type === 'income').map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleProcess('save', c.id)}
                          className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex gap-4">
              <button
                onClick={handleUndo}
                disabled={actionHistory.length === 0}
                className="flex items-center text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition font-medium"
              >
                <Undo className="w-5 h-5 mr-2" />
                Undo
              </button>
              <button
                onClick={() => handleProcess('ignore')}
                className="flex items-center text-gray-600 hover:text-red-600 hover:bg-red-50 px-4 py-3 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Ignore
              </button>
            </div>
            
            <button
              onClick={() => handleProcess('requeue')}
              className="flex items-center text-gray-600 bg-gray-100 hover:bg-gray-200 px-6 py-3 rounded-lg transition"
            >
              <SkipForward className="w-5 h-5 mr-2" />
              Skip (Re-queue)
            </button>
          </div>
        </div>
      )}

      {/* Rule Creation Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Create Automation Rule</h3>
            <p className="text-sm text-gray-500 mb-6">
              Create a rule to automatically handle transactions matching this description in the future.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description Match</label>
                <div className="flex gap-2">
                  <select
                    value={ruleMatchType}
                    onChange={(e) => setRuleMatchType(e.target.value as MatchType)}
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="exact">Exact Match</option>
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
                    value={ruleMatch}
                    onChange={(e) => setRuleMatch(e.target.value)}
                    className="w-2/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleMinAmount}
                    onChange={(e) => setRuleMinAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleMaxAmount}
                    onChange={(e) => setRuleMaxAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={ruleAction}
                    onChange={(e) => setRuleAction(e.target.value as 'categorize' | 'ignore')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="categorize">Assign Category</option>
                    <option value="ignore">Ignore Transaction</option>
                  </select>
                </div>
                {ruleAction === 'categorize' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={ruleCategory}
                      onChange={(e) => setRuleCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">-- Select --</option>
                      {state.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={!ruleMatch.trim() || (ruleAction === 'categorize' && !ruleCategory)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                Save & Apply Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
