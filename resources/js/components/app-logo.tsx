import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-primary-foreground">
                <AppLogoIcon className="size-5 object-contain text-current" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium capitalize">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                    Gestion du personnel
                </span>
            </div>
        </>
    );
}
