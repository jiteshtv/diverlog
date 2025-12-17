import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Loader2, ArrowLeft, Printer, Pencil, Trash2, X } from 'lucide-react';
import { format, set } from 'date-fns';

interface DiveEvent {
    id: string;
    event_time: string;
    event_type: string;
    description: string;
    depth: number;
}

export default function DiveReport() {
    const { diveId } = useParams();
    const navigate = useNavigate();
    const [dive, setDive] = useState<any>(null);
    const [events, setEvents] = useState<DiveEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DiveEvent | null>(null);

    // Form State for Modal
    const [formData, setFormData] = useState({
        time: '',
        depth: 0,
        event_type: '',
        description: ''
    });

    useEffect(() => {
        if (diveId) fetchDiveDetails();
    }, [diveId]);

    async function fetchDiveDetails() {
        setLoading(true);
        try {
            const { data: diveData, error: diveError } = await supabase
                .from('dives')
                .select(`*, job:jobs(*), diver:divers(*), supervisor:profiles(full_name)`)
                .eq('id', diveId)
                .single();

            if (diveError) throw diveError;

            const { data: eventsData, error: eventsError } = await supabase
                .from('dive_events')
                .select('*')
                .eq('dive_id', diveId)
                .order('event_time', { ascending: true });

            if (eventsError) throw eventsError;

            setDive(diveData);
            setEvents(eventsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const startEdit = (event: DiveEvent | null) => {
        if (!event) {
            // Create New
            setEditingEvent({ id: 'new', event_time: new Date().toISOString(), event_type: '', description: '', depth: 0 });
            setFormData({ time: '', depth: 0, event_type: '', description: '' });
        } else {
            // Edit Existing
            setEditingEvent(event);
            setFormData({
                time: format(new Date(event.event_time), 'HH:mm:ss'),
                depth: event.depth,
                event_type: event.event_type,
                description: event.description || ''
            });
        }
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;

        try {
            // Reconstruct full ISO date. For new events, default to dive date or today if fallback
            // For existing, keep the original day.
            let baseDate = new Date();
            if (editingEvent.id !== 'new') {
                baseDate = new Date(editingEvent.event_time);
            } else if (dive?.date) {
                baseDate = new Date(dive.date);
            }

            const [hours, minutes, seconds] = formData.time.split(':').map(Number);
            const newDate = set(baseDate, {
                hours: hours || 0,
                minutes: minutes || 0,
                seconds: seconds || 0
            });

            if (editingEvent.id === 'new') {
                const { error } = await supabase.from('dive_events').insert([{
                    dive_id: diveId,
                    event_time: newDate.toISOString(),
                    depth: formData.depth,
                    event_type: formData.event_type,
                    description: formData.description
                }]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('dive_events')
                    .update({
                        event_time: newDate.toISOString(),
                        depth: formData.depth,
                        event_type: formData.event_type,
                        description: formData.description
                    })
                    .eq('id', editingEvent.id);
                if (error) throw error;
            }

            setEditingEvent(null);
            fetchDiveDetails();
        } catch (error) {
            alert('Failed to save event');
            console.error(error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event log?')) return;
        try {
            const { error } = await supabase.from('dive_events').delete().eq('id', id);
            if (error) throw error;
            fetchDiveDetails();
        } catch (error) {
            console.error(error);
            alert('Failed to delete event');
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ocean-400" /></div>;
    if (!dive) return <div className="p-12 text-center text-white">Dive not found</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white text-black p-8 rounded-xl shadow-2xl min-h-screen">
            <div className="flex justify-between items-start mb-8 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-ocean-600">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-4 py-2 rounded flex items-center transition-colors ${isEditMode ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Pencil className="w-4 h-4 mr-2" /> {isEditMode ? 'Done Editing' : 'Edit Log'}
                    </button>
                    <button onClick={() => window.print()} className="bg-ocean-600 text-white px-4 py-2 rounded flex items-center hover:bg-ocean-700">
                        <Printer className="w-4 h-4 mr-2" /> Print Record
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-widest">Diving Operations Log</h1>
                <p className="text-sm text-slate-600">Offshore Division</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Job:</span> {dive.job?.job_name}</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Client:</span> {dive.job?.client_name}</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Location:</span> {dive.job?.location}</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Date:</span> {format(new Date(dive.date), 'dd MMM yyyy')}</div>

                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Diver:</span> {dive.diver?.full_name} ({dive.diver?.rank})</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Supervisor:</span> {dive.supervisor?.full_name || 'N/A'}</div>

                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Dive No:</span> {dive.dive_no || '---'}</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Max Depth:</span> {dive.max_depth || '---'} msw</div>

                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Start Time:</span> {dive.start_time?.slice(0, 5)}</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">End Time:</span> {dive.end_time?.slice(0, 5)}</div>
                <div className="border-b border-slate-200 pb-2"><span className="font-bold w-32 inline-block">Bottom Time:</span> {dive.bottom_time}</div>
            </div>

            {/* Events Table */}
            <div className="flex justify-between items-end border-b border-black mb-4 pb-1">
                <h3 className="font-bold text-lg uppercase">Time / Depth / Event Log</h3>
                {isEditMode && (
                    <button onClick={() => startEdit(null)} className="text-sm bg-green-600 text-white px-3 py-1 rounded flex items-center hover:bg-green-700 print:hidden">
                        <Plus className="w-4 h-4 mr-1" /> Add Entry
                    </button>
                )}
            </div>
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-100 border-y border-black">
                        <th className="py-2 px-4 text-left font-bold w-24">Time</th>
                        <th className="py-2 px-4 text-left font-bold w-20">Depth</th>
                        <th className="py-2 px-4 text-left font-bold">Event / Observation</th>
                        {isEditMode && <th className="py-2 px-4 text-right font-bold w-24 print:hidden">Action</th>}
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <tr key={event.id} className={`border-b border-slate-200 ${isEditMode ? 'hover:bg-amber-50' : ''}`}>
                            <td className="py-2 px-4 font-mono">{format(new Date(event.event_time), 'HH:mm')}</td>
                            <td className="py-2 px-4 font-mono">{event.depth}m</td>
                            <td className="py-2 px-4">
                                <span className="font-bold mr-2">{event.event_type}</span>
                                <span className="text-slate-700">{event.description}</span>
                            </td>
                            {isEditMode && (
                                <td className="py-2 px-4 text-right print:hidden">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => startEdit(event)} className="p-1 text-ocean-600 hover:bg-ocean-100 rounded">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteEvent(event.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Edit Modal */}
            {editingEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center print:hidden z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingEvent.id === 'new' ? 'Add New Entry' : 'Edit Event'}</h3>
                            <button onClick={() => setEditingEvent(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSaveEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded p-2 font-mono"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Depth (m)</label>
                                <input
                                    type="number"
                                    className="w-full border border-slate-300 rounded p-2"
                                    value={formData.depth}
                                    onChange={e => setFormData({ ...formData, depth: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Type</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded p-2"
                                    value={formData.event_type}
                                    onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded p-2"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="w-full bg-ocean-600 text-white font-bold py-3 rounded-lg hover:bg-ocean-700">
                                {editingEvent.id === 'new' ? 'Add Entry' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="mt-12 pt-8 border-t border-black flex justify-between text-sm">
                <div>
                    <p className="mb-8">Diver Signature:</p>
                    <div className="w-48 border-b border-black"></div>
                </div>
                <div>
                    <p className="mb-8">Supervisor Signature:</p>
                    <div className="w-48 border-b border-black"></div>
                </div>
            </div>
        </div>
    );
}
