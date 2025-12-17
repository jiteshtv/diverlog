import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight, Anchor, User, Calendar } from 'lucide-react';

interface DiveReport {
    id: string;
    dive_no: number;
    date: string;
    start_time: string;
    end_time: string;
    max_depth: number;
    bottom_time: string;
    job: { job_name: string; client_name: string };
    diver: { full_name: string; rank: string };
    events_count: number;
}

export default function DailyReport() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dives, setDives] = useState<DiveReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDives();
    }, [selectedDate]);

    async function fetchDives() {
        setLoading(true);
        // Note: This query assumes relationships are set up correctly in Supabase which might be tricky with manual SQL.
        // We'll use a standard join syntax or client-side join if relations aren't detected.
        // Assuming the setup in schema.sql supports foreign keys detected by PostgREST.

        try {
            const { data, error } = await supabase
                .from('dives')
                .select(`
           *,
           job:jobs(job_name, client_name),
           diver:divers(full_name, rank)
        `)
                .eq('date', selectedDate)
                .order('dive_no', { ascending: true });

            if (error) throw error;
            setDives(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center">
                    <FileText className="w-8 h-8 mr-3 text-ocean-400" />
                    Daily Operations Report
                </h1>
                <div className="flex items-center space-x-4">
                    <div className="bg-deep-800 rounded-lg p-1 border border-ocean-700">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-transparent text-white border-none focus:ring-0 p-2 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-6 print:space-y-4">
                {dives.length === 0 && !loading ? (
                    <div className="text-center p-12 bg-deep-800/20 rounded-xl border border-dashed border-ocean-800">
                        <Calendar className="w-12 h-12 mx-auto text-ocean-800 mb-2" />
                        <p className="text-slate-400">No dives logged for {format(new Date(selectedDate), 'MMMM do, yyyy')}</p>
                    </div>
                ) : (
                    dives.map((dive) => (
                        <div key={dive.id} className="bg-deep-800 border border-ocean-900/50 rounded-xl overflow-hidden print:border-black print:bg-white print:text-black">
                            {/* Header */}
                            <div className="bg-deep-900/50 p-4 border-b border-ocean-800 flex justify-between items-center print:bg-slate-100 print:text-black">
                                <div className="flex items-center space-x-4">
                                    <span className="bg-ocean-600 text-white text-xs font-bold px-2 py-1 rounded print:bg-black">
                                        DIVE #{dive.dive_no || '---'}
                                    </span>
                                    <span className="text-ocean-200 text-sm font-medium print:text-slate-600">
                                        {format(new Date(dive.date), 'dd/MM/yyyy')}
                                    </span>
                                </div>
                                <div className="flex space-x-6 text-sm">
                                    <div className="flex items-center text-slate-300 print:text-black">
                                        <span className="text-slate-500 mr-2 uppercase text-xs">Start</span>
                                        <span className="font-mono text-ocean-200 print:text-black">{dive.start_time?.slice(0, 5)}</span>
                                    </div>
                                    <div className="flex items-center text-slate-300 print:text-black">
                                        <span className="text-slate-500 mr-2 uppercase text-xs">End</span>
                                        <span className="font-mono text-ocean-200 print:text-black">{dive.end_time?.slice(0, 5)}</span>
                                    </div>
                                    <div className="flex items-center text-slate-300 print:text-black">
                                        <span className="text-slate-500 mr-2 uppercase text-xs">Bottom Time</span>
                                        <span className="font-bold text-white print:text-black">{dive.bottom_time || '0 min'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div className="flex items-start space-x-3">
                                    <Anchor className="w-5 h-5 text-ocean-500 mt-1" />
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Job Details</p>
                                        <p className="text-white font-medium print:text-black">{dive.job?.job_name}</p>
                                        <p className="text-sm text-ocean-300 print:text-slate-600">{dive.job?.client_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <User className="w-5 h-5 text-ocean-500 mt-1" />
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Diver</p>
                                        <p className="text-white font-medium print:text-black">{dive.diver?.full_name}</p>
                                        <p className="text-sm text-ocean-300 print:text-slate-600">{dive.diver?.rank}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Show footer only in web view */}
                            <Link to={`/reports/${dive.id}`} className="block bg-ocean-900/40 p-3 text-center text-sm font-bold text-ocean-400 print:hidden hover:bg-ocean-800 hover:text-white cursor-pointer transition-colors border-t border-ocean-800/30">
                                View Full Log & Events <ChevronRight className="w-4 h-4 inline ml-1" />
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
