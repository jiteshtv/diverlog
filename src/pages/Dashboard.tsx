import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, TrendingUp, Calendar, Anchor, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardStats {
    activeDives: number;
    divesToday: number;
    activeJob: string;
}

interface RecentDive {
    id: string;
    date: string;
    job: { job_name: string };
    diver: { full_name: string };
    status: string;
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>({ activeDives: 0, divesToday: 0, activeJob: 'None' });
    const [recentDives, setRecentDives] = useState<RecentDive[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();

        // Optional: Set up real-time subscription for immediate updates
        const subscription = supabase
            .channel('dashboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dives' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    async function fetchDashboardData() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Get Active Dives Count
            const { count: activeCount, error: activeError } = await supabase
                .from('dives')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'in_progress');

            if (activeError) throw activeError;

            // 2. Get Dives Today Count
            const { count: todayCount, error: todayError } = await supabase
                .from('dives')
                .select('*', { count: 'exact', head: true })
                .gte('date', today.toISOString());

            if (todayError) throw todayError;

            // 3. Get Active Job Name (Most recent active one)
            const { data: jobData } = await supabase
                .from('jobs')
                .select('job_name')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Ignore job error if no rows found
            const activeJobName = jobData?.job_name || 'No Active Job';

            setStats({
                activeDives: activeCount || 0,
                divesToday: todayCount || 0,
                activeJob: activeJobName
            });

            // 4. Get Recent Activity (Last 5 dives)
            const { data: recent, error: recentError } = await supabase
                .from('dives')
                .select(`
                    id,
                    date,
                    status,
                    job:jobs(job_name),
                    diver:divers(full_name)
                `)
                .order('date', { ascending: false })
                .limit(5);

            if (recentError) throw recentError;
            // Supabase returns arrays for joined relations, but we know it's 1:1 here.
            // However, the typed response might say array. We can fix by casting or safe access.
            // For now, let's cast as any to bypass the strict mismatch if the shape is correct at runtime.
            // Better: update the interface to match what Supabase actually returns (arrays for joined tables usually imply array unless simple relation).
            // Actually, `job:jobs(job_name)` usually returns an object if it's a single join, or array.
            // Let's assume the error says: Property 'job_name' is missing in type '{ job_name: any; }[]'.
            // This means TS thinks it's an array.
            setRecentDives((recent as any)?.map((d: any) => ({
                ...d,
                job: Array.isArray(d.job) ? d.job[0] : d.job,
                diver: Array.isArray(d.diver) ? d.diver[0] : d.diver
            })) || []);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-ocean-400 animate-spin" /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Operations Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Active Dives Card */}
                <div className="bg-deep-800 border border-ocean-700/50 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-ocean-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 text-ocean-400" />
                    </div>
                    <h3 className="text-ocean-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" /> Active Dives
                    </h3>
                    <p className="text-5xl font-bold text-white mb-1">{stats.activeDives}</p>
                    <p className="text-sm text-slate-400">currently under water</p>
                </div>

                {/* Dives Today Card */}
                <div className="bg-deep-800 border border-ocean-700/50 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-ocean-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 text-ocean-400" />
                    </div>
                    <h3 className="text-ocean-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" /> Dives Today
                    </h3>
                    <p className="text-5xl font-bold text-white mb-1">{stats.divesToday}</p>
                    <p className="text-sm text-slate-400">{format(new Date(), 'dd MMM yyyy')}</p>
                </div>

                {/* Active Job Card */}
                <div className="bg-deep-800 border border-ocean-700/50 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-ocean-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Anchor className="w-24 h-24 text-ocean-400" />
                    </div>
                    <h3 className="text-ocean-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center">
                        <Anchor className="w-4 h-4 mr-2" /> Current Job
                    </h3>
                    <p className="text-2xl font-bold text-white mb-1 line-clamp-2 leading-tight min-h-[3rem] items-center flex">
                        {stats.activeJob}
                    </p>
                    <Link to="/jobs" className="text-sm text-ocean-300 hover:text-white inline-flex items-center mt-2">
                        View Jobs <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                <div className="bg-deep-800 border border-ocean-900/50 rounded-xl overflow-hidden shadow-lg">
                    {recentDives.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p>No activity recorded yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-deep-900 border-b border-ocean-900 text-ocean-200 text-sm uppercase">
                                    <tr>
                                        <th className="p-4 font-medium">Date/Time</th>
                                        <th className="p-4 font-medium">Job</th>
                                        <th className="p-4 font-medium">Diver</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ocean-900/50 text-slate-300">
                                    {recentDives.map(dive => (
                                        <tr key={dive.id} className="hover:bg-deep-700/50 transition-colors">
                                            <td className="p-4 whitespace-nowrap">
                                                {format(new Date(dive.date), 'dd MMM HH:mm')}
                                            </td>
                                            <td className="p-4 font-medium text-white">{dive.job?.job_name || 'Unknown Job'}</td>
                                            <td className="p-4">{dive.diver?.full_name || 'Unknown Diver'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${dive.status === 'in_progress' ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-700 text-slate-400'
                                                    }`}>
                                                    {dive.status === 'in_progress' ? 'Active' : 'Completed'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link to={`/reports/${dive.id}`} className="text-ocean-400 hover:text-white text-sm font-medium">
                                                    View Report
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
