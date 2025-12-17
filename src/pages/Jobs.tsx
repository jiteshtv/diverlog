import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Anchor, MapPin, Pencil } from 'lucide-react';

interface Job {
    id: string;
    job_name: string;
    location: string;
    client_name: string;
    status: string;
    description: string;
}

export default function Jobs() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        job_name: '',
        location: '',
        client_name: '',
        description: '',
        status: 'active'
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    async function fetchJobs() {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    }

    const openAddModal = () => {
        setFormData({ id: '', job_name: '', location: '', client_name: '', description: '', status: 'active' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEditModal = (job: Job) => {
        setFormData({
            id: job.id,
            job_name: job.job_name,
            location: job.location || '',
            client_name: job.client_name || '',
            description: job.description || '',
            status: job.status
        });
        setIsEditing(true);
        setShowModal(true);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (isEditing) {
                // Update
                const { error } = await supabase
                    .from('jobs')
                    .update({
                        job_name: formData.job_name,
                        location: formData.location,
                        client_name: formData.client_name,
                        description: formData.description,
                        status: formData.status
                    })
                    .eq('id', formData.id);

                if (error) throw error;
            } else {
                // Create
                // Remove ID from insert
                const { id, ...newJobData } = formData;
                const { error } = await supabase.from('jobs').insert([newJobData]);
                if (error) throw error;
            }

            setShowModal(false);
            fetchJobs();
        } catch (error) {
            alert(`Error ${isEditing ? 'updating' : 'adding'} job`);
            console.error(error);
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Jobs Management</h1>
                <button
                    onClick={openAddModal}
                    className="bg-ocean-600 hover:bg-ocean-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-ocean-900/50"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Job</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-ocean-400 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {jobs.map(job => (
                        <div key={job.id} className="relative bg-deep-800 border border-ocean-900/50 rounded-xl p-6 flex flex-col justify-between hover:border-ocean-600/50 transition-colors group">

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(job)}
                                    className="p-2 bg-deep-900 text-ocean-400 hover:text-white rounded-lg hover:bg-ocean-600 transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-ocean-900 flex items-center justify-center text-ocean-400 shrink-0">
                                        <Anchor className="w-5 h-5" />
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${job.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                                        {job.status}
                                    </span>
                                </div>

                                <h3 className="font-bold text-xl text-white mb-1">{job.job_name}</h3>
                                <p className="text-ocean-200 text-sm mb-4">{job.client_name}</p>

                                {job.location && (
                                    <div className="flex items-center text-slate-400 text-sm mb-4">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {job.location}
                                    </div>
                                )}

                                <p className="text-slate-500 text-sm line-clamp-2">{job.description}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-ocean-900/30 flex justify-end">
                                <button
                                    onClick={() => openEditModal(job)}
                                    className="text-ocean-400 text-sm font-medium hover:text-ocean-300"
                                >
                                    Edit Details
                                </button>
                            </div>
                        </div>
                    ))}

                    {jobs.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-deep-800/20 rounded-xl border border-dashed border-ocean-800">
                            <p className="text-slate-400 mb-2">No jobs found.</p>
                            <button onClick={openAddModal} className="text-ocean-400 hover:text-ocean-300 font-medium">Create a new job</button>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-deep-800 border border-ocean-700/50 rounded-xl w-full max-w-lg p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {isEditing ? 'Edit Job' : 'Create New Job'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-ocean-200 mb-1">Job Name / ID</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 outline-none"
                                    value={formData.job_name}
                                    onChange={e => setFormData({ ...formData, job_name: e.target.value })}
                                    placeholder="e.g. Pipeline Inspection #123"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-ocean-200 mb-1">Client Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 outline-none"
                                        value={formData.client_name}
                                        onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-ocean-200 mb-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 outline-none"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-ocean-200 mb-1">Description</label>
                                <textarea
                                    className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 outline-none min-h-[100px]"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Scope of work..."
                                />
                            </div>

                            {isEditing && (
                                <div>
                                    <label className="block text-sm text-ocean-200 mb-1">Status</label>
                                    <select
                                        className="w-full bg-deep-900 border border-ocean-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-ocean-500 outline-none"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            )}

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
                                    {isEditing ? 'Update Job' : 'Create Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
