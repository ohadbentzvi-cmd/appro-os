'use client';
import { useWizardState } from './useWizardState';

export function Step1BuildingDetails({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
    const { building, setBuilding } = wizard;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setBuilding({
            ...building,
            [name]: type === 'number' ? (value ? parseInt(value, 10) : undefined) : value,
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-apro-navy mb-6">פרטי הבניין</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">שם הבניין * <span className="text-gray-400 font-normal">(לדוגמה: "מגדלי הים התיכון" או "רחוב הרצל 12")</span></label>
                        <input
                            type="text"
                            name="name"
                            value={building.name}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="שם הבניין"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">רחוב *</label>
                        <input
                            type="text"
                            name="street"
                            value={building.street}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="הזן שם רחוב"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">מספר *</label>
                            <input
                                type="text"
                                name="street_number"
                                value={building.street_number}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                                placeholder="מס'"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">עיר *</label>
                            <input
                                type="text"
                                name="city"
                                value={building.city}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                                placeholder="עיר"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">מספר קומות <span className="text-gray-400 font-normal">(אופציונלי)</span></label>
                        <input
                            type="number"
                            name="floors"
                            min="1"
                            value={building.floors || ''}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">שנת בנייה <span className="text-gray-400 font-normal">(אופציונלי)</span></label>
                        <input
                            type="number"
                            name="year_built"
                            min="1800"
                            max={new Date().getFullYear()}
                            value={building.year_built || ''}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="YYYY"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
