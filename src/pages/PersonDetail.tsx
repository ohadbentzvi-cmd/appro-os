import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { supabase, Person } from '../supabase';

export default function PersonDetail() {
    const { id } = useParams<{ id: string }>();
    const [person, setPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPerson() {
            try {
                const { data, error } = await supabase
                    .from('people')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    setPerson(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchPerson();
        }
    }, [id]);

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Breadcrumb - using ChevronLeft for Hebrew (RTL) right-to-left flow */}
            <nav className="flex items-center text-sm font-medium text-gray-500 mb-8 mt-2">
                <Link to="/dashboard/people" className="hover:text-apro-navy transition-colors">
                    אנשים
                </Link>
                <ChevronLeft className="w-4 h-4 mx-2" />
                <span className="text-apro-navy">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : (person?.full_name || 'טוען...')}
                </span>
            </nav>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 text-center">
                <h2 className="text-2xl font-bold text-gray-400 mb-2">פרטי אדם — בקרוב</h2>
                <p className="text-gray-400">עמוד זה יאפשר ניהול מפורט של פרטי האדם ותפקידיו.</p>
            </div>
        </div>
    );
}
