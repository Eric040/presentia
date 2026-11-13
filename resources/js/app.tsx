import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { PageLoader } from '@/components/page-loader';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name.startsWith('errors/'):
                return null;
            default:
                return AppLayout;
        }
    },
    resolve: async (name) => {
        // Gérer les pages d'erreur
        if (name.startsWith('errors/')) {
            const errorCode = name.split('/')[1];
            const errorPages = ['403', '404', '419', '500', '503'];
            
            if (errorPages.includes(errorCode)) {
                const page = await import(`./pages/errors/${errorCode}.tsx`);
                return page;
            } else {
                const page = await import('./pages/errors/default.tsx');
                return page;
            }
        }

        // Résolution normale des pages
        const pages = import.meta.glob('./pages/**/*.tsx');
        const page = await pages[`./pages/${name}.tsx`]();
        return page;
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <PageLoader />
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
        showSpinner: true,
    },
});

// This will set light / dark mode on load...
initializeTheme();
