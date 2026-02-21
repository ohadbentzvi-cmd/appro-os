import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function UnitDetailPlaceholder() {
    const { id, unitId } = useParams();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    to={`/dashboard/buildings/${id}`}
                    className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-apro-navy"
                >
                    <ChevronRight className="w-6 h-6" />
                </Link>
                <h1 className="text-3xl font-bold text-apro-navy">פרטי יחידה (שומר מקום)</h1>
            </div>

            <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
                <h2 className="text-xl font-bold text-gray-600 mb-2">עמוד פרטי יחידה: {unitId}</h2>
                <p className="text-gray-500">
                    עמוד זה עדיין בבנייה (יפותח בשלב הבא).
                </p>
            </div>
        </div>
    );
}
