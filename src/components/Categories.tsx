import React, { useState } from 'react';
import { useStore } from '../store';
import type { CategoryType } from '../types';
import { Plus, Trash2 } from 'lucide-react';

const Categories: React.FC = () => {
  const { state, addCategory, deleteCategory } = useStore();
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<CategoryType>('cost');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), newCatType);
    setNewCatName('');
  };

  const incomeCategories = state.categories.filter((c) => c.type === 'income');
  const costCategories = state.categories.filter((c) => c.type === 'cost');

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Categories Management</h2>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Add New Category</h3>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            placeholder="Category Name..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as CategoryType)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="cost">Cost</option>
            <option value="income">Income</option>
          </select>
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
          >
            <Plus className="w-5 h-5 mr-1" />
            Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-red-600 border-b pb-2">Cost Categories</h3>
          {costCategories.length === 0 ? (
            <p className="text-gray-500 italic">No cost categories yet.</p>
          ) : (
            <ul className="space-y-3">
              {costCategories.map((c) => (
                <li key={c.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-700">{c.name}</span>
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-green-600 border-b pb-2">Income Categories</h3>
          {incomeCategories.length === 0 ? (
            <p className="text-gray-500 italic">No income categories yet.</p>
          ) : (
            <ul className="space-y-3">
              {incomeCategories.map((c) => (
                <li key={c.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-700">{c.name}</span>
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
