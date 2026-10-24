import React from 'react';

interface SimControlsProps {
    onStart: () => void;
    onStop: () => void;
    isRunning: boolean;
}

export const SimControls: React.FC<SimControlsProps> = ({ onStart, onStop, isRunning }) => {
    return (
        <div style={{ display: 'flex', gap: '10px', padding: '10px' }}>
            <button onClick={onStart} disabled={isRunning}>Start Simulation</button>
            <button onClick={onStop} disabled={!isRunning}>Stop Simulation</button>
        </div>
    );
};
