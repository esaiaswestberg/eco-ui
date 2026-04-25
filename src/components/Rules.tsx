import React, { useState } from 'react';
import { useStore } from '../store';
import { Trash2, Edit2, Save } from 'lucide-react';
import type { Rule, MatchType } from '../types';

const matchTypeLabel: Record<MatchType, string> = {
  exact: 'Exact Match',
  contains: 'Contains',
  starts_with: 'Starts With',
  ends_with: 'Ends With',
  not_exact: 'Does Not Equal',
  not_contains: 'Does Not Contain',
  not_starts_with: 'Does Not Start With',
  not_ends_with: 'Does Not End With'
};

const Rules: React.FC = () => {
  const { state, addRule, updateRule, deleteRule, applyRules } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [descriptionMatch, setDescriptionMatch] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('exact');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [action, setAction] = useState<'categorize' | 'ignore'>('categorize');
  const [categoryId, setCategoryId] = useState<string>('');

  const resetForm = () => {
    setEditingId(null);
    setDescriptionMatch('');
    setMatchType('exact');
    setMinAmount('');
    setMaxAmount('');
    setAction('categorize');
    setCategoryId('');
  };

  const handleEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setDescriptionMatch(rule.descriptionMatch);
    setMatchType(rule.matchType);
    setMinAmount(rule.minAmount !== undefined ? rule.minAmount.toString() : '');
    setMaxAmount(rule.maxAmount !== undefined ? rule.maxAmount.toString() : '');
    setAction(rule.action);
    setCategoryId(rule.categoryId || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descriptionMatch.trim()) {
      alert('Description match is required');
      return;
    }
    if (action === 'categorize' && !categoryId) {
      alert('Category is required when action is categorize');
      return;
    }

    const ruleData: Omit<Rule, 'id'> = {
      descriptionMatch: descriptionMatch.trim(),
      matchType,
      action,
      ...(minAmount && { minAmount: parseFloat(minAmount) }),
      ...(maxAmount && { maxAmount: parseFloat(maxAmount) }),
      ...(action === 'categorize' && { categoryId }),
    };

    if (editingId) {
      updateRule(editingId, ruleData);
    } else {
      addRule(ruleData);
    }
    resetForm();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Automation Rules</h2>
        <button
          onClick={() => {
            applyRules();
            alert('Rules manually applied to pending queue!');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Run Rules on Pending Queue
        </button>
      </div>

      {/* Rule Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">
          {editingId ? 'Edit Rule' : 'Create New Rule'}
        </h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description Match</label>
              <input
                type="text"
                value={descriptionMatch}
                onChange={(e) => setDescriptionMatch(e.target.value)}
                placeholder="e.g. Spotify, Netflix, Ica..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as MatchType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
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
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (Absolute)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (Absolute)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as 'categorize' | 'ignore')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="categorize">Assign Category</option>
                  <option value="ignore">Ignore Transaction</option>
                </select>
              </div>
              {action === 'categorize' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
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
          
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex items-center bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Save className="w-5 h-5 mr-2" />
              {editingId ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">Description</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">Match Type</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">Amount Range</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">Action</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {state.rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                  No rules created yet.
                </td>
              </tr>
            ) : (
              state.rules.map((r) => {
                const cat = state.categories.find(c => c.id === r.categoryId);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{r.descriptionMatch}</td>
                    <td className="px-6 py-4 text-gray-600">{matchTypeLabel[r.matchType]}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {r.minAmount !== undefined || r.maxAmount !== undefined ? (
                        <>
                          {r.minAmount !== undefined ? `${r.minAmount} kr` : '0 kr'} - {r.maxAmount !== undefined ? `${r.maxAmount} kr` : '∞ kr'}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Any</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.action === 'ignore' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Ignore
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Assign: {cat?.name || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-500 hover:text-blue-700 transition"
                      >
                        <Edit2 className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this rule?')) deleteRule(r.id);
                        }}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Rules;
