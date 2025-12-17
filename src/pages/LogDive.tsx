import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Play, Square, Save, Clock, ArrowDown, ArrowUp, Briefcase, AlertTriangle, CheckCircle2, History, ExternalLink, User, CalendarPlus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Job { id: string; job_name: string; }
interface Diver { id: string; full_name: string; rank: string; }
interface DiveEvent {
    id: string;
    event_time: string;
    event_type: string;
    description: string;
    depth: number;
}
interface HistoricalDive {
    id: string;
    dive_no: number;
    date: string;
    diver: { full_name: string };
    status: string;
}

export default function LogDive() {
    const { user } = useAuth();

    // Selection State
    const [jobs, setJobs] = useState<Job[]>([]);
    const [divers, setDivers] = useState<Diver[]>([]);
    const [selectedJob, setSelectedJob] = useState('');
    const [selectedDiver, setSelectedDiver] = useState('');

    // History State
    const [jobHistory, setJobHistory] = useState<HistoricalDive[]>([]);

    // Manual Entry State
    const [showManualLog, setShowManualLog] = useState(false);
    const [manualEntryData, setManualEntryData] = useState({
        time: '',
        depth: '0',
        type: '',
        desc: '',
        closeDive: false
    });

    // Active Dive State
    const [activeDiveId, setActiveDiveId] = useState<string | null>(null);
    const [diveStartTime, setDiveStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [currentDepth, setCurrentDepth] = useState(0);

    // Events
    const [events, setEvents] = useState<DiveEvent[]>([]);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        if (selectedJob) {
            fetchJobHistory(selectedJob);
        } else {
            setJobHistory([]);
        }
    }, [selectedJob, activeDiveId]); // Refresh history when a new dive starts/ends

    useEffect(() => {
        if (activeDiveId && diveStartTime) {
            timerRef.current = window.setInterval(() => {
                setElapsed(Math.floor((Date.now() - diveStartTime) / 1000));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeDiveId, diveStartTime]);

    async function fetchResources() {
        const { data: jobsData } = await supabase.from('jobs').select('id, job_name').eq('status', 'active');
        const { data: diversData } = await supabase.from('divers').select('id, full_name, rank');
        if (jobsData) setJobs(jobsData);
        if (diversData) setDivers(diversData);
    }

    async function fetchJobHistory(jobId: string) {
        const { data, error } = await supabase
            .from('dives')
            .select(`
                id, 
                dive_no, 
                date, 
                status,
                diver:divers(full_name)
            `)
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching history:', error);
        else setJobHistory((data as any) || []);
    }

    async function handleDeleteDive(id: string) {
        if (!confirm('Are you sure you want to delete this dive log? This action cannot be undone.')) return;
        try {
            await supabase.from('dive_events').delete().eq('dive_id', id);
            const { error } = await supabase.from('dives').delete().eq('id', id);
            if (error) throw error;
            if (selectedJob) fetchJobHistory(selectedJob);
        } catch (error) {
            console.error('Error deleting dive:', error);
            alert('Failed to delete dive log');
        }
    }

    async function startDive() {
        if (!selectedJob || !selectedDiver) {
            alert('Please select a Job and a Diver');
            return;
        }

        try {
            // Ensure profile exists for the supervisor (FK requirement)
            if (user?.id) {
                const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
                if (!profile) {
                    await supabase.from('profiles').insert([{
                        id: user.id,
                        username: user.email,
                        full_name: user.email?.split('@')[0],
                        role: 'admin' // Default to admin for dev ease, usually 'user'
                    }]);
                }
            }

            const { data, error } = await supabase.from('dives').insert([{
                job_id: selectedJob,
                diver_id: selectedDiver,
                supervisor_id: user?.id,
                date: new Date().toISOString(),
                start_time: new Date().toLocaleTimeString(),
                status: 'in_progress'
            }]).select().single();

            if (error) throw error;

            setActiveDiveId(data.id);
            setDiveStartTime(Date.now());
            logEvent(data.id, 'Dive Started', 'Commenced dive operation');
        } catch (error: any) {
            console.error('Error starting dive', error);
            alert(`Failed to start dive: ${error.message || error.details}`);
        }
    }

    async function stopDive() {
        if (!activeDiveId) return;
        if (!confirm('Are you sure you want to end this dive?')) return;

        try {
            await logEvent(activeDiveId, 'Dive Ended', 'Completed dive operation');

            const { error } = await supabase.from('dives').update({
                end_time: new Date().toLocaleTimeString(),
                status: 'completed',
                bottom_time: `${Math.floor(elapsed / 60)} minutes`
            }).eq('id', activeDiveId);

            if (error) throw error;

            setActiveDiveId(null);
            setDiveStartTime(null);
            setElapsed(0);
            setEvents([]);
            setSelectedDiver('');
        } catch (error) {
            console.error('Error ending dive', error);
        }
    }

    async function logEvent(diveId: string, type: string, desc: string = '', timeOverride?: string, depthOverride?: number) {
        try {
            const { data, error } = await supabase.from('dive_events').insert([{
                dive_id: diveId,
                event_time: timeOverride || new Date().toISOString(),
                event_type: type,
                description: desc,
                depth: depthOverride !== undefined ? depthOverride : currentDepth
            }]).select().single();

            if (error) throw error;

            setEvents(prev => [data, ...prev]);
        } catch (error) {
            console.error('Error logging event', error);
        }
    }

    async function completeDiveManually(isoTime: string) {
        if (!activeDiveId) return;

        try {
            let durationStr = '0 minutes';
            if (diveStartTime) {
                const endMs = new Date(isoTime).getTime();
                const diffMs = endMs - diveStartTime;
                durationStr = `${Math.floor(diffMs / 60000)} minutes`;
            }

            const { error } = await supabase.from('dives').update({
                end_time: new Date(isoTime).toLocaleTimeString(),
                status: 'completed',
                bottom_time: durationStr
            }).eq('id', activeDiveId);

            if (error) throw error;

            setActiveDiveId(null);
            setDiveStartTime(null);
            setElapsed(0);
            setEvents([]);
            setSelectedDiver('');

            if (selectedJob) fetchJobHistory(selectedJob);

        } catch (error) {
            console.error('Error completing dive manually', error);
            alert('Failed to close dive status');
        }
    }

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const ActionButton = ({ label, icon: Icon, color, onClick }: any) => (
        <button
            onClick={onClick}
            disabled={!activeDiveId}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 border border-white/5 shadow-lg ${!activeDiveId ? 'opacity-50 cursor-not-allowed bg-slate-800' : color}`}
        >
            <Icon className="w-5 h-5 mb-1" />
            <span className="font-bold text-xs text-center leading-tight">{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
            {/* Top Bar: Session Setup */}
            <div className="bg-deep-800 border border-ocean-700/50 rounded-xl p-4 shadow-md flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-ocean-400" />
                        <span className="font-bold text-white text-sm whitespace-nowrap">Active Job:</span>
                    </div>
                    <select
                        disabled={!!activeDiveId}
                        className="bg-deep-900 border border-ocean-600 rounded px-3 py-2 text-white text-sm flex-1 max-w-xs"
                        value={selectedJob}
                        onChange={e => setSelectedJob(e.target.value)}
                    >
                        <option value="">-- Select Job --</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.job_name}</option>)}
                    </select>

                    <div className="w-px h-8 bg-ocean-800 mx-2 hidden md:block"></div>

                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-ocean-400" />
                        <span className="font-bold text-white text-sm whitespace-nowrap">Diver:</span>
                    </div>
                    <select
                        disabled={!!activeDiveId}
                        className="bg-deep-900 border border-ocean-600 rounded px-3 py-2 text-white text-sm flex-1 max-w-xs"
                        value={selectedDiver}
                        onChange={e => setSelectedDiver(e.target.value)}
                    >
                        <option value="">-- Select Diver --</option>
                        {divers.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.rank})</option>)}
                    </select>
                </div>

                <div>
                    {!activeDiveId ? (
                        <button
                            onClick={startDive}
                            disabled={!selectedJob || !selectedDiver}
                            className={`px-6 py-2 rounded-lg font-bold flex items-center shadow-lg transition-transform hover:scale-105 ${(!selectedJob || !selectedDiver) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-500'}`}
                        >
                            <Play className="w-4 h-4 mr-2" /> Start Dive
                        </button>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-green-400 font-bold uppercase tracking-wider">Elapsed</div>
                                <div className="font-mono text-xl font-bold text-white leading-none">{formatTime(elapsed)}</div>
                            </div>
                            <button
                                onClick={stopDive}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center shadow-lg transition-transform hover:scale-105"
                            >
                                <Square className="w-4 h-4 mr-2" /> End
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">

                {/* LEFT COL: Controls (3/12 width) */}
                <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
                    {/* Depth Control */}
                    <div className="bg-deep-800 border border-ocean-700/50 rounded-xl p-4 shadow-lg">
                        <h2 className="text-xs font-bold text-ocean-300 uppercase tracking-wider mb-2 text-center">Current Depth (msw)</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentDepth(Math.max(0, currentDepth - 1))} className="p-3 bg-deep-700 hover:bg-deep-600 rounded-lg text-white transition-colors"><ArrowUp className="w-5 h-5" /></button>
                            <div className="flex-1 bg-black text-center py-2 rounded border border-ocean-800">
                                <span className="text-3xl font-mono font-bold text-green-400">{currentDepth}</span>
                            </div>
                            <button onClick={() => setCurrentDepth(currentDepth + 1)} className="p-3 bg-deep-700 hover:bg-deep-600 rounded-lg text-white transition-colors"><ArrowDown className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 flex-1 content-start">
                        <ActionButton label="Left Surface" icon={ArrowDown} color="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => logEvent(activeDiveId!, 'Leaving the Surface')} />
                        <ActionButton label="On Bottom" icon={CheckCircle2} color="bg-cyan-600 hover:bg-cyan-500 text-white" onClick={() => logEvent(activeDiveId!, 'Arrived Worksite')} />
                        <ActionButton label="Start Work" icon={Briefcase} color="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => logEvent(activeDiveId!, 'Start Work')} />
                        <ActionButton label="Stop Work" icon={Briefcase} color="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => logEvent(activeDiveId!, 'Stop Work')} />
                        <ActionButton label="Left Bottom" icon={ArrowUp} color="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => logEvent(activeDiveId!, 'Leaving Worksite')} />
                        <ActionButton label="On Surface" icon={ArrowUp} color="bg-violet-600 hover:bg-violet-500 text-white" onClick={() => logEvent(activeDiveId!, 'On Surface')} />
                        <ActionButton label="Observation" icon={Save} color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => {
                            const desc = prompt('Enter observation details:');
                            if (desc) logEvent(activeDiveId!, 'Observation', desc);
                        }} />
                        <ActionButton label="Incident" icon={AlertTriangle} color="bg-red-700 hover:bg-red-600 text-white" onClick={() => {
                            const desc = prompt('Enter incident details:');
                            if (desc) logEvent(activeDiveId!, 'INCIDENT', desc);
                        }} />

                        {/* Missed Log Button */}
                        <button
                            onClick={() => setShowManualLog(true)}
                            disabled={!activeDiveId}
                            className={`col-span-2 flex items-center justify-center p-3 rounded-xl border border-dashed border-ocean-500/50 bg-ocean-900/30 text-ocean-300 hover:bg-ocean-900/50 hover:text-white transition-colors ${!activeDiveId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <CalendarPlus className="w-5 h-5 mr-2" />
                            <span className="font-bold text-xs uppercase tracking-wider">Add Missed Log Entry</span>
                        </button>
                    </div>
                </div>

                {/* ... Middle and Right Columns ... */}

                {/* MIDDLE COL: Live Log (5/12 width) */}
                <div className="lg:col-span-5 bg-deep-800 border border-ocean-700/50 rounded-xl flex flex-col shadow-2xl overflow-hidden h-full">
                    <div className="p-3 bg-deep-900/50 border-b border-ocean-800 flex justify-between items-center shrink-0">
                        <h2 className="text-sm font-bold text-white flex items-center"><Clock className="w-4 h-4 mr-2 text-ocean-400" /> Live Event Log</h2>
                        {activeDiveId && <span className="animate-pulse w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {events.length === 0 ? (
                            <div className="text-center text-slate-500 mt-20 opacity-50">
                                <Clock className="w-10 h-10 mx-auto mb-2" />
                                <p className="text-xs">Waiting for events...</p>
                            </div>
                        ) : (
                            events.map((event, idx) => (
                                <div key={event.id || idx} className="flex items-start space-x-3 p-2 rounded bg-deep-900/40 border border-white/5 text-sm">
                                    <div className="text-ocean-400 font-mono text-xs whitespace-nowrap mt-0.5">
                                        {format(new Date(event.event_time), 'HH:mm:ss')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-white truncate">{event.event_type}</span>
                                            <span className="text-[10px] text-slate-400 bg-deep-950 px-1.5 py-0.5 rounded font-mono">
                                                {event.depth}m
                                            </span>
                                        </div>
                                        {event.description && (
                                            <p className="text-xs text-ocean-200 mt-0.5 truncate">{event.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT COL: Job History (4/12 width) */}
                <div className="lg:col-span-4 bg-deep-800 border border-ocean-700/50 rounded-xl flex flex-col shadow-xl overflow-hidden h-full">
                    <div className="p-3 bg-deep-900/50 border-b border-ocean-800 shrink-0">
                        <h2 className="text-sm font-bold text-white flex items-center"><History className="w-4 h-4 mr-2 text-ocean-400" /> Job History</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {!selectedJob ? (
                            <div className="text-center text-slate-500 mt-20 text-xs">Select a job to view history</div>
                        ) : jobHistory.length === 0 ? (
                            <div className="text-center text-slate-500 mt-20 text-xs">No previous dives recorded</div>
                        ) : (
                            jobHistory.map((dive) => (
                                <div key={dive.id} className="bg-deep-900/30 border border-white/5 rounded-lg p-3 hover:bg-deep-900/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-white text-sm">Dive #{dive.dive_no}</div>
                                            <div className="text-xs text-ocean-300">{format(new Date(dive.date), 'dd MMM yyyy')}</div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Link
                                                to={`/reports/${dive.id}`}
                                                className="text-xs bg-ocean-900 text-ocean-400 px-2 py-1 rounded border border-ocean-800 hover:text-white hover:border-ocean-500 flex items-center transition-colors"
                                            >
                                                View / Edit <ExternalLink className="w-3 h-3 ml-1" />
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteDive(dive.id)}
                                                className="text-xs bg-red-900/30 text-red-500 px-2 py-1 rounded border border-red-900 hover:bg-red-800 hover:text-white transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">{dive.diver?.full_name}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${dive.status === 'in_progress' ? 'bg-green-900 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                                            {dive.status === 'in_progress' ? 'Active' : 'Completed'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {
                showManualLog && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="bg-deep-800 border border-ocean-700 p-6 rounded-xl w-full max-w-sm shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-white">Add Missed Entry</h3>
                                <button onClick={() => setShowManualLog(false)}><span className="text-slate-400 hover:text-white">✕</span></button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!manualEntryData.type) return;

                                // Calculate timestamp
                                const [h, m] = manualEntryData.time.split(':');
                                const now = new Date();
                                const eventTime = new Date(now.setHours(parseInt(h), parseInt(m), 0)).toISOString();

                                // Log event
                                await logEvent(activeDiveId!, manualEntryData.type, manualEntryData.desc, eventTime, parseFloat(manualEntryData.depth));

                                // Handle Dive Completion
                                if (manualEntryData.closeDive) {
                                    await completeDiveManually(eventTime);
                                }

                                setShowManualLog(false);
                                setManualEntryData({ time: format(new Date(), 'HH:mm'), depth: currentDepth.toString(), type: '', desc: '', closeDive: false });
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-ocean-300 uppercase mb-1">Time (HH:MM)</label>
                                    <input
                                        type="time"
                                        className="w-full bg-black border border-ocean-700 rounded p-2 text-white"
                                        value={manualEntryData.time}
                                        onChange={e => setManualEntryData({ ...manualEntryData, time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ocean-300 uppercase mb-1">Depth (m)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black border border-ocean-700 rounded p-2 text-white"
                                        value={manualEntryData.depth}
                                        onChange={e => setManualEntryData({ ...manualEntryData, depth: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ocean-300 uppercase mb-1">Event Type</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-ocean-700 rounded p-2 text-white"
                                        value={manualEntryData.type}
                                        onChange={e => setManualEntryData({ ...manualEntryData, type: e.target.value })}
                                        placeholder="e.g. Dive Ended"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-ocean-300 uppercase mb-1">Description</label>
                                    <textarea
                                        className="w-full bg-black border border-ocean-700 rounded p-2 text-white h-20"
                                        value={manualEntryData.desc}
                                        onChange={e => setManualEntryData({ ...manualEntryData, desc: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center space-x-2 bg-red-900/20 p-3 rounded border border-red-500/30">
                                    <input
                                        type="checkbox"
                                        id="closeDive"
                                        checked={manualEntryData.closeDive}
                                        onChange={e => setManualEntryData({ ...manualEntryData, closeDive: e.target.checked })}
                                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                                    />
                                    <label htmlFor="closeDive" className="text-sm text-red-200 font-bold cursor-pointer">
                                        End Log & Complete Dive?
                                    </label>
                                </div>

                                <button type="submit" className={`w-full font-bold py-3 rounded-lg transition-colors ${manualEntryData.closeDive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-ocean-600 hover:bg-ocean-700 text-white'}`}>
                                    {manualEntryData.closeDive ? 'Add Entry & Finish Dive' : 'Add Entry'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
