import React, { useState } from 'react';
import { Home } from 'lucide-react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-3xl">
            <div className="glass-panel p-12 max-w-md w-full text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-accent/30 mb-8 shadow-[0_0_30px_rgba(224,242,254,0.1)]">
                    <Home size={32} className="text-brand-accent" />
                </div>
                <h1 className="text-3xl font-serif mb-2 text-white">Between Us</h1>
                <p className="text-sm opacity-70 mb-8 text-blue-100">{isLogin ? 'Welcome back to the space.' : 'Create a new space.'}</p>
                
                {error && <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 w-full">{error}</div>}
                
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                    <input type="email" placeholder="Email" required className="glass-input" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" required className="glass-input" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" disabled={loading} className="glass-button accent py-3 mt-2 font-bold w-full">
                        {loading ? 'Authenticating...' : (isLogin ? 'Enter' : 'Create')}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-6 text-xs opacity-60 hover:opacity-100 transition">
                    {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                </button>
            </div>
        </div>
    );
};

export default React.memo(AuthScreen);
