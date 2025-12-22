import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Debugging
    console.log('UpdatePassword component rendered');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage('Error: Passwords do not match');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage('Password updated successfully! Redirecting...');
            setTimeout(() => navigate('/'), 2000);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-deep-900 p-4">
            <div className="w-full max-w-md p-8 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
                <h1 className="text-2xl font-bold text-center text-white mb-6">Set New Password</h1>

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-ocean-100 mb-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-ocean-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-deep-800/50 border border-ocean-700/50 rounded-lg pl-10 pr-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                placeholder="Min 6 characters"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-ocean-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ocean-100 mb-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-ocean-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-deep-800/50 border border-ocean-700/50 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                placeholder="Re-enter password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ocean-600 hover:bg-ocean-500 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading && <Loader2 className="animate-spin mr-2" />}
                        Update Password
                    </button>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm text-center ${message.includes('Error') ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
