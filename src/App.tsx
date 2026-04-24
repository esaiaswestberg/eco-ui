import { useState } from 'react';
import { LayoutDashboard, Tags, UploadCloud, Settings, Sliders, ListOrdered } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Categories from './components/Categories';
import Upload from './components/Upload';
import Rules from './components/Rules';
import Transactions from './components/Transactions';
import SettingsView from './components/Settings';
import { StoreProvider } from './store';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'categories' | 'upload' | 'rules' | 'transactions' | 'settings'>('dashboard');

  return (
    <StoreProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-green-600">Eco-UI</h1>
            <p className="text-sm text-gray-500">Finance Organizer</p>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('transactions')}
              className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${currentView === 'transactions' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <ListOrdered className="mr-3 h-5 w-5" />
              Transactions
            </button>
            <button
              onClick={() => setCurrentView('categories')}
              className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${currentView === 'categories' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Tags className="mr-3 h-5 w-5" />
              Categories
            </button>
            <button
              onClick={() => setCurrentView('upload')}
              className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${currentView === 'upload' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <UploadCloud className="mr-3 h-5 w-5" />
              Upload
            </button>
            <button
              onClick={() => setCurrentView('rules')}
              className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${currentView === 'rules' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Sliders className="mr-3 h-5 w-5" />
              Rules
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${currentView === 'settings' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'transactions' && <Transactions />}
          {currentView === 'categories' && <Categories />}
          {currentView === 'upload' && <Upload />}
          {currentView === 'rules' && <Rules />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>
    </StoreProvider>
  );
}

export default App;
