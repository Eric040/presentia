import { usePage } from '@inertiajs/react';

export function useT() {
    const { props } = usePage();
    const translations = props.translations as Record<string, string> || {};

    return (key: string, params?: Record<string, string | number>): string => {
        let translation = translations[key] || key;

        if (params) {
            Object.entries(params).forEach(([param, value]) => {
                translation = translation.replace(`:${param}`, String(value));
            });
        }

        return translation;
    };
}
