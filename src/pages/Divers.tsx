import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, User, Pencil } from 'lucide-react';

interface Diver {
    id: string;
    full_name: string;
    rank: string;
    email: string | null;
    phone: string | null;
    certification_no: string | null;
}

export default function Divers() {
    const [divers, setDivers] = useState<Diver[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        full_name: '',
        rank: '',
        email: '',
        phone: '',
        certification_no: ''
    });

    // Rank State (from Master Table)
    const [availableRanks, setAvailableRanks] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            // Fetch Divers
            const { data: diversData, error: diversError } = await supabase.from('divers').select('*').order('full_name');
            if (diversError) throw diversError;
            setDivers(diversData || []);

            // Fetch Ranks (Master List)
            const { data: ranksData, error: ranksError } = await supabase.from('ranks').select('name').order('name');
            // If table doesn't exist yet, we might get an error. Handle gracefully or fallback.
            if (ranksError) {
                console.warn('Could not fetch ranks (table might not exist yet). Using defaults.', ranksError);
                setAvailableRanks(['Supervisor', 'Diver 1', 'Diver 2', 'Diver 3', 'Tender', 'LSS']);
            } else {
                setAvailableRanks(ranksData.map(r => r.name));
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    const openAddModal = () => {
        // Default to first available rank if possible, else empty
        setFormData({ id: '', full_name: '', rank: availableRanks[0] || '', email: '', phone: '', certification_no: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (diver: Diver) => {
        setFormData({
            id: diver.id,
            full_name: diver.full_name,
            rank: diver.rank,
            email: diver.email || '',
            phone: diver.phone || '',
            certification_no: diver.certification_no || ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (isEditing) {
                // Update existing diver
                const { error } = await supabase
                    .from('divers')
                    .update({
                        full_name: formData.full_name,
                        rank: formData.rank,
                        email: formData.email,
                        phone: formData.phone,
                        certification_no: formData.certification_no
                    })
                    .eq('id', formData.id);

                if (error) throw error;
            } else {
                // Add new diver
                const { id, ...newDiverData } = formData;
                const { error } = await supabase.from('divers').insert([newDiverData]);
                if (error) throw error;
            }

            setShowModal(false);
            fetchData();
        } catch (error) {
            alert(`Error ${isEditing ? 'updating' : 'adding'} diver`);
            console.error(error);
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Divers Management</h1>
                <button
                    onClick={openAddModal}
                    className="bg-ocean-600 hover:bg-ocean-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-ocean-900/50"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Diver</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-ocean-400 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {divers.map(diver => (
                        <div key={diver.id} className="relative bg-deep-800 border border-ocean-900/50 rounded-xl p-6 hover:border-ocean-600/50 transition-colors group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(diver)}
                                    className="p-2 bg-deep-900 text-ocean-400 hover:text-white rounded-lg hover:bg-ocean-600 transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 rounded-full bg-ocean-900 flex items-center justify-center text-ocean-400 shrink-0">
                                    <User className="w-6 h-6" />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-lg text-white truncate pr-6">{diver.full_name}</h3>
                                    <span className="inline-block px-2 py-1 rounded bg-ocean-500/20 text-ocean-300 text-xs font-medium mb-2">{diver.rank}</span>
                                    <div className="text-sm text-slate-400 space-y-1">
                                        <p className="truncate">Cert: {diver.certification_no || 'N/A'}</p>
                                        <p className="truncate">{diver.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {divers.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-deep-800/20 rounded-xl border border-dashed border-ocean-800">
                            <p className="text-slate-400 mb-2">No divers found in the registry.</p>
                            <button onClick={openAddModal} className="text-ocean-400 hover:text-ocean-300 font-medium">Add your first diver</button>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-deep-800 border border-ocean-700/50 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {isEditing ? 'Edit Diver' : 'Add New Diver'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-ocean-200 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-ocean-200 mb-1">Rank</label>
                                <select
                                    className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none"
                                    value={formData.rank}
                                    onChange={e => setFormData({ ...formData, rank: e.target.value })}
                                >
                                    <option value="" disabled>Select Rank</option>
                                    {availableRanks.map(rank => (
                                        <option key={rank} value={rank}>{rank}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-ocean-400 mt-1">
                                    * Manage ranks in <a href="/library" className="underline hover:text-ocean-200">Library Master</a>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-ocean-200 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-ocean-200 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-ocean-200 mb-1">Certification No</label>
                                <input
                                    type="text"
                                    className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none"
                                    value={formData.certification_no}
                                    onChange={e => setFormData({ ...formData, certification_no: e.target.value })}
                                />
                            </div>
                            <div className="flex space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-deep-900 hover:bg-deep-950 text-slate-300 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-ocean-600 hover:bg-ocean-500 text-white py-3 rounded-lg font-medium transition-colors shadow-lg shadow-ocean-900/20"
                                >
                                    {isEditing ? 'Update Diver' : 'Add Diver'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
