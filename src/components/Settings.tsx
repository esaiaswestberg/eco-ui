import React, { useRef } from 'react';
import { useStore } from '../store';
import { Download, Upload as UploadIcon, Trash2 } from 'lucide-react';

const SettingsView: React.FC = () => {
  const { state, importData, clearData } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'eco-ui-backup.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Are you sure you want to overwrite current data with this file? This cannot be undone.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        if (jsonData.categories && jsonData.transactions) {
          importData(jsonData);
          alert('Data imported successfully!');
        } else {
          alert('Invalid file format. Ensure it is an Eco-UI backup.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      clearData();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Settings & Data</h2>

      <div className="bg-white rounded-lg shadow-md p-8 flex flex-col gap-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Export Data</h3>
          <p className="text-gray-500 mb-4">Download a JSON backup of all your categories and handled transactions.</p>
          <button
            onClick={handleExport}
            className="flex items-center bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Backup
          </button>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Import Data</h3>
          <p className="text-gray-500 mb-4">Restore your data from a JSON backup. Warning: This will overwrite your current data.</p>
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            <UploadIcon className="w-5 h-5 mr-2" />
            Import Backup
          </button>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Danger Zone</h3>
          <p className="text-gray-500 mb-4">Permanently delete all categories and transactions from this device.</p>
          <button
            onClick={handleClear}
            className="flex items-center bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
