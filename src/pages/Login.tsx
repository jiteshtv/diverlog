import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, CheckCircle2, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function Login() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const navigate = useNavigate();

    // Strict Email Validation
    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // 1. Validation
        if (!validateEmail(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' });
            return;
        }

        if (mode !== 'forgot' && password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);

        try {
            if (mode === 'signup') {
                const { error, data } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            email_confirmed: true // Skip email verification for development
                        }
                    },
                });
                if (error) throw error;

                // Check if user already exists based on response
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    setMessage({ type: 'error', text: 'User already exists. Please login.' });
                } else {
                    setMessage({ type: 'success', text: 'Registration successful! You can now login.' });
                    setMode('login'); // Switch to login view for convenience
                    setPassword(''); // Clear password
                }
            }
            else if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });
                if (error) throw error;
                // Navigation handled by onAuthStateChange or just here
                navigate('/');
            }
            else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/update-password`,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Password reset link sent to your email.' });
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            setMessage({ type: 'error', text: error.message || 'Authentication failed. Please check your credentials.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-deep-900">
            {/* Background with overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/login-bg.png"
                    alt="Offshore Diving"
                    className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/50 to-transparent"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
                <h1 className="text-4xl font-bold text-center text-white mb-2 tracking-tight">Diverlog</h1>
                <p className="text-center text-ocean-200 mb-8 uppercase tracking-widest text-xs">Offshore Operations Logger</p>

                {/* Header / Mode Switcher logic */}
                {mode === 'forgot' ? (
                    <div className="mb-6">
                        <button onClick={() => setMode('login')} className="text-ocean-300 hover:text-white flex items-center text-sm mb-4">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
                        </button>
                        <h2 className="text-xl font-bold text-white">Reset Password</h2>
                        <p className="text-slate-400 text-sm">Enter your email to receive a reset link.</p>
                    </div>
                ) : (
                    <div className="flex bg-deep-900/50 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => { setMode('login'); setMessage(null); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'login' ? 'bg-ocean-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setMessage(null); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signup' ? 'bg-ocean-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Register
                        </button>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ocean-100 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-ocean-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-deep-800/50 border border-ocean-700/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-ocean-400/50 focus:outline-none focus:ring-2 focus:ring-ocean-500 transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    {mode !== 'forgot' && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-ocean-100">Password</label>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => { setMode('forgot'); setMessage(null); }}
                                        className="text-xs text-ocean-400 hover:text-ocean-200"
                                    >
                                        Forgot Password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-ocean-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-deep-800/50 border border-ocean-700/50 rounded-lg pl-10 pr-10 py-3 text-white placeholder-ocean-400/50 focus:outline-none focus:ring-2 focus:ring-ocean-500 transition-all"
                                    placeholder="••••••••"
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
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ocean-600 hover:bg-ocean-500 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center shadow-lg shadow-ocean-900/50 mt-4"
                    >
                        {loading && <Loader2 className="animate-spin mr-2 w-5 h-5" />}
                        {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : (mode === 'signup' ? 'Create Account' : 'Send Reset Link'))}
                    </button>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-start ${message.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-green-500/20 text-green-200 border border-green-500/30'}`}>
                            {message.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2 shrink-0" /> : <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />}
                            <span>{message.text}</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
