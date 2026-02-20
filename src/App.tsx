/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase, Building } from './supabase';
import { Building2, ChevronLeft, Loader2, AlertCircle, Home, Settings } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuildings() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBuildings(data || []);
      } catch (err: any) {
        console.error('Error fetching buildings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBuildings();
  }, []);

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
            href="#" 
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
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-apro-navy mb-2">ניהול מבנים</h1>
          <p className="text-gray-500 font-medium">צפייה וניהול של כל הנכסים במערכת</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-xl font-bold text-apro-navy">רשימת מבנים בניהול</h2>
            <div className="text-sm text-gray-500 font-medium">
              סה"כ: {buildings.length} מבנים
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-apro-green animate-spin" />
              <p className="text-gray-500 font-medium">טוען נתונים מהמערכת...</p>
            </div>
          ) : error ? (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <div className="bg-red-50 p-4 rounded-full text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-red-900 mb-1">שגיאה בטעינת הנתונים</h3>
                <p className="text-red-700 text-sm mb-4">{error}</p>
                <p className="text-gray-500 text-sm">
                  אנא וודא שהגדרת את פרטי ה-Supabase שלך ב-Secrets ושיצרת את הטבלה המתאימה.
                </p>
              </div>
            </div>
          ) : buildings.length === 0 ? (
            <div className="p-20 text-center">
              <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-400">אין מבנים להצגה</h3>
              <p className="text-gray-400">הוסף מבנים למסד הנתונים כדי לראות אותם כאן.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">שם המבנה</th>
                    <th className="px-6 py-4 font-semibold">כתובת</th>
                    <th className="px-6 py-4 font-semibold text-center">קומות</th>
                    <th className="px-6 py-4 font-semibold text-center">דירות</th>
                    <th className="px-6 py-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {buildings.map((building, index) => (
                    <motion.tr 
                      key={building.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-apro-navy">{building.name}</div>
                        {building.built_year && (
                          <div className="text-xs text-gray-400">שנת הקמה: {building.built_year}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        {building.address_street}, {building.address_city}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-apro-navy">
                        {building.num_floors}
                      </td>
                      <td className="px-6 py-5 text-center font-medium text-apro-navy">
                        {building.num_units}
                      </td>
                      <td className="px-6 py-5 text-left">
                        <button className="bg-white border border-gray-200 hover:border-apro-green hover:text-apro-green text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 mr-auto">
                          צפייה
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
