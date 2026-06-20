import React, { useState } from 'react';

const SettingsModal = ({ relationship, updateData, close }) => {
    const [nameA, setNameA] = useState(relationship.nameA || '');
    const [nameB, setNameB] = useState(relationship.nameB || '');
    const [baseDistance, setBaseDistance] = useState(relationship.baseDistance || 6400);
    const [genderA, setGenderA] = useState(relationship.genderA || (relationship.cycleUser === 'A' ? 'Female' : 'Male'));
    const [genderB, setGenderB] = useState(relationship.genderB || (relationship.cycleUser === 'B' ? 'Female' : 'Male'));

    const isFormValid = nameA.trim() !== '' && nameB.trim() !== '';

    const save = () => {
        if (!isFormValid) return;
        
        let cycleUser = 'None';
        if (genderA === 'Female') cycleUser = 'A';
        else if (genderB === 'Female') cycleUser = 'B';
        
        updateData({ nameA, nameB, baseDistance: Number(baseDistance), genderA, genderB, cycleUser });
        close();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-3xl">
            <div className="glass-panel p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-serif text-brand-accent mb-6">Space Settings</h2>
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 block">Partner A's Name</label>
                            <input type="text" className="glass-input w-full" value={nameA} onChange={e => setNameA(e.target.value)} placeholder="e.g. Linda" />
                        </div>
                        <div className="w-1/3">
                            <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 block">Gender</label>
                            <select className="glass-input w-full text-white bg-transparent" value={genderA} onChange={e => setGenderA(e.target.value)}>
                                <option value="Female" className="text-black">Female</option>
                                <option value="Male" className="text-black">Male</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 block">Partner B's Name</label>
                            <input type="text" className="glass-input w-full" value={nameB} onChange={e => setNameB(e.target.value)} placeholder="e.g. John" />
                        </div>
                        <div className="w-1/3">
                            <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 block">Gender</label>
                            <select className="glass-input w-full text-white bg-transparent" value={genderB} onChange={e => setGenderB(e.target.value)}>
                                <option value="Male" className="text-black">Male</option>
                                <option value="Female" className="text-black">Female</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 block">Distance Apart (KM)</label>
                        <input type="number" className="glass-input w-full" value={baseDistance} onChange={e => setBaseDistance(e.target.value)} />
                    </div>
                </div>
                {!isFormValid && <p className="text-red-400 text-xs mb-4">Please fill out both names to continue.</p>}
                <div className="flex justify-end gap-4">
                    <button onClick={close} className="px-4 py-2 text-sm opacity-60 hover:opacity-100 transition">Cancel</button>
                    <button onClick={save} disabled={!isFormValid} className={`glass-button accent px-6 py-2 font-bold ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SettingsModal);
