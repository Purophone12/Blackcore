import React, { createContext, useContext, useState } from 'react';
import { DEMO_USER } from '../mockData';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
    const [isDemoMode, setIsDemoMode] = useState(() => {
        return localStorage.getItem('blackcore_demo') === 'true';
    });

    const enterDemoMode = () => {
        localStorage.setItem('blackcore_demo', 'true');
        setIsDemoMode(true);
    };

    const exitDemoMode = () => {
        localStorage.removeItem('blackcore_demo');
        setIsDemoMode(false);
    };

    return (
        <DemoContext.Provider value={{ isDemoMode, demoUser: DEMO_USER, enterDemoMode, exitDemoMode }}>
            {children}
        </DemoContext.Provider>
    );
}

export function useDemo() {
    return useContext(DemoContext);
}
