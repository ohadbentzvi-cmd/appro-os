import { Routes, Route, Navigate } from 'react-router-dom';
import { Building2, Home, Settings } from 'lucide-react';
import BuildingsList from './pages/BuildingsList';
import BuildingDetail from './pages/BuildingDetail';
import UnitDetailPlaceholder from './pages/UnitDetailPlaceholder';

export default function App() {
  return (
    <div className="min-h-screen flex bg-[#f8f9fa] font-sans">
      {/* Right Sidebar Navigation */}
      <aside className="w-64 bg-apro-navy text-white flex flex-col fixed inset-y-0 right-0 z-50 shadow-xl">
        {/* Logo Section */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-apro-green p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">אפרו נדל"ן</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-grow p-4 space-y-2 mt-4">
          <a
            href="/dashboard/buildings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-apro-green text-white font-bold transition-all shadow-lg shadow-apro-green/20"
          >
            <Home className="w-5 h-5" />
            <span>עמוד הבית</span>
          </a>
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-white/10">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            <span className="font-medium">מערכת</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow mr-64 p-8 lg:p-12">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/buildings" replace />} />
          <Route path="/dashboard/buildings" element={<BuildingsList />} />
          <Route path="/dashboard/buildings/:id" element={<BuildingDetail />} />
          <Route path="/dashboard/buildings/:id/units/:unitId" element={<UnitDetailPlaceholder />} />
        </Routes>
      </main>
    </div>
  );
}
