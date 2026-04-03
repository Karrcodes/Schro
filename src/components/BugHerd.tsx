'use client'

import { useEffect } from 'react'

export function BugHerd() {
    useEffect(() => {
        // Function to load BugHerd
        const loadBugHerd = () => {
            if (document.getElementById('bugherd-loader')) return;

            const script = document.createElement('script');
            script.id = 'bugherd-loader';
            script.type = 'text/javascript';
            script.src = 'https://www.bugherd.com/sidebarv2.js?apikey=x8pltr1clmsbpoauxgbj1a';
            script.async = true;
            
            // Critical fix: Force BugHerd to ignore the formal 'load' event if it's already past it
            // or if the page is conceptually 'complete'
            document.body.appendChild(script);
            console.log('[BugHerd] Manual injection triggered');
        };

        // Execute after a short delay to ensure hydration is finished
        const timer = setTimeout(() => {
            if (document.readyState === 'complete') {
                loadBugHerd();
            } else {
                window.addEventListener('load', loadBugHerd);
            }
        }, 2000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('load', loadBugHerd);
        };
    }, []);

    return null;
}
