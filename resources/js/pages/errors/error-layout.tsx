import { Head, Link } from '@inertiajs/react';
import { Home, ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type ErrorLayoutProps = {
    code: string;
    title: string;
    message: string;
    icon: ReactNode;
    showBackButton?: boolean;
};

export function ErrorLayout({ code, title, message, icon, showBackButton = true }: ErrorLayoutProps) {
    return (
        <>
            <Head title={`${code} - ${title}`} />
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <div className="w-full max-w-md space-y-8 text-center">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="rounded-full bg-primary/10 p-6">
                            {icon}
                        </div>
                    </div>

                    {/* Error Code */}
                    <div>
                        <h1 className="text-6xl font-bold tabular-nums text-primary">
                            {code}
                        </h1>
                        <h2 className="mt-4 text-2xl font-semibold">
                            {title}
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        {showBackButton && (
                            <Button
                                variant="outline"
                                onClick={() => window.history.back()}
                                className="gap-2"
                            >
                                <ArrowLeft className="size-4" />
                                Retour
                            </Button>
                        )}
                        <Button asChild className="gap-2">
                            <Link href="/">
                                <Home className="size-4" />
                                Accueil
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
