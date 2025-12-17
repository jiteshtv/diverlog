import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash2, Database } from 'lucide-react';

interface Rank {
    id: string;
    name: string;
}

export default function Library() {
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRank, setNewRank] = useState('');

    useEffect(() => {
        fetchRanks();
    }, []);

    async function fetchRanks() {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('ranks').select('*').order('name');
            if (error) throw error;
            setRanks(data || []);
        } catch (error) {
            console.error('Error fetching ranks:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddRank(e: React.FormEvent) {
        e.preventDefault();
        if (!newRank.trim()) return;

        try {
            const { error } = await supabase.from('ranks').insert([{ name: newRank.trim() }]);
            if (error) throw error;
            setNewRank('');
            fetchRanks();
        } catch (error) {
            alert('Error adding rank (might already exist)');
        }
    }

    async function handleDeleteRank(id: string) {
        if (!confirm('Are you sure you want to delete this rank?')) return;
        try {
            const { error } = await supabase.from('ranks').delete().eq('id', id);
            if (error) throw error;
            fetchRanks();
        } catch (error) {
            console.error('Error deleting rank:', error);
            alert('Failed to delete rank');
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Database className="w-8 h-8 mr-3 text-ocean-400" />
                Library Master
            </h1>
            <p className="text-slate-400 mb-8">Manage standard dropdown lists and master data.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Ranks Manager Card */}
                <div className="bg-deep-800 border border-ocean-700/50 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Diver Ranks</h2>

                    <form onSubmit={handleAddRank} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            className="flex-1 bg-deep-900 border border-ocean-700 rounded-lg p-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-ocean-500 outline-none"
                            placeholder="Add new rank..."
                            value={newRank}
                            onChange={e => setNewRank(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-ocean-600 hover:bg-ocean-500 text-white p-2 rounded-lg transition-colors"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </form>

                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-ocean-400 animate-spin" /></div>
                    ) : (
                        <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {ranks.map(rank => (
                                <li key={rank.id} className="flex justify-between items-center bg-deep-900/50 p-3 rounded-lg border border-white/5 hover:border-ocean-500/30 transition-colors group">
                                    <span className="text-slate-200 font-medium">{rank.name}</span>
                                    <button
                                        onClick={() => handleDeleteRank(rank.id)}
                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Rank"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Placeholder for future libraries */}
                <div className="bg-deep-800/50 border border-dashed border-ocean-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <Database className="w-12 h-12 text-ocean-900 mb-4" />
                    <h3 className="text-ocean-300 font-bold mb-2">More Configurations</h3>
                    <p className="text-slate-500 text-sm">Future master lists (e.g., Job Types, Clients) can be added here.</p>
                </div>
            </div>
        </div>
    );
}
