import React, { useState } from 'react';
import { Home, Star } from 'lucide-react';
import { db } from '../firebase';
import { ref, get, set, update } from 'firebase/database';
import { defaultState } from '../constants';

const PairingScreen = ({ user, setUserData }) => {
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const createSpace = async () => {
        setLoading(true);
        setError('');
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            await set(ref(db, 'sanctuaries/' + code), { ...defaultState, partnerA: user.uid });
            await set(ref(db, 'users/' + user.uid), { spaceId: code, role: 'A' });
            setUserData({ spaceId: code, role: 'A' });
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to create space. Check your connection or Firebase rules.');
        }
        setLoading(false);
    };

    const joinSpace = async () => {
        if (!joinCode) return;
        setLoading(true);
        setError('');
        try {
            const code = joinCode.toUpperCase();
            const spaceRef = ref(db, 'sanctuaries/' + code);
            const snapshot = await get(spaceRef);
            if (snapshot.exists() && !snapshot.val().partnerB) {
                await update(spaceRef, { partnerB: user.uid });
                await set(ref(db, 'users/' + user.uid), { spaceId: code, role: 'B' });
                setUserData({ spaceId: code, role: 'B' });
            } else {
                setError('Invalid code or Space is full.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to join space. Check the code and try again.');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-3xl">
            <div className="glass-panel p-12 max-w-2xl w-full flex flex-col items-center">
                <h1 className="text-3xl font-serif mb-8 text-white text-center">Establish Connection</h1>
                {error && <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 w-full text-center">{error}</div>}
                
                <div className="flex flex-col md:flex-row gap-6 w-full">
                    <div className="flex-1 glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center mb-4"><Star className="text-yellow-400"/></div>
                        <h2 className="text-lg font-bold mb-2">Create Space</h2>
                        <p className="text-xs opacity-60 mb-6">Start a new space and get a Connection Code to give to your partner. You will be Partner A.</p>
                        <button onClick={createSpace} disabled={loading} className="glass-button accent py-2 px-6 font-bold w-full mt-auto">Create</button>
                    </div>

                    <div className="flex-1 glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-sky-400/10 flex items-center justify-center mb-4"><Home className="text-sky-400"/></div>
                        <h2 className="text-lg font-bold mb-2">Join Space</h2>
                        <p className="text-xs opacity-60 mb-6">Enter a Connection Code from your partner to link your accounts. You will be Partner B.</p>
                        <input type="text" placeholder="6-Digit Code" className="glass-input mb-4 text-center tracking-widest uppercase" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
                        <button onClick={joinSpace} disabled={loading} className="glass-button w-full py-2 font-bold">Connect</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(PairingScreen);
