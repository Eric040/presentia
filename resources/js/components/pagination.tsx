import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// =========================
// TYPES
// =========================

export type PaginationData = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type PaginationProps = {
    data: PaginationData;
    onPageChange?: (page: number) => void;
    className?: string;
    showPerPageSelector?: boolean;
    perPageOptions?: number[];
};

// =========================
// COMPONENT
// =========================

export function Pagination({
    data,
    onPageChange,
    className,
    showPerPageSelector = false,
    perPageOptions = [10, 20, 50, 100],
}: PaginationProps) {
    const { current_page, last_page, per_page, total, from, to } = data;

    const goToPage = (page: number) => {
        if (page < 1 || page > last_page || page === current_page) return;
        
        if (onPageChange) {
            onPageChange(page);
        } else {
            // Par défaut, utilise Inertia pour naviguer avec le paramètre "page"
            router.get(
                window.location.pathname,
                { ...Object.fromEntries(new URLSearchParams(window.location.search)), page },
                { preserveState: true, preserveScroll: true }
            );
        }
    };

    const changePerPage = (newPerPage: string) => {
        router.get(
            window.location.pathname,
            { ...Object.fromEntries(new URLSearchParams(window.location.search)), per_page: newPerPage, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Générer les numéros de page à afficher
    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const pages: (number | 'ellipsis')[] = [];
        const showPages = 5; // Nombre de pages à afficher

        if (last_page <= showPages + 2) {
            // Afficher toutes les pages si peu nombreuses
            for (let i = 1; i <= last_page; i++) {
                pages.push(i);
            }
        } else {
            // Toujours afficher la première page
            pages.push(1);

            if (current_page > 3) {
                pages.push('ellipsis');
            }

            // Pages autour de la page actuelle
            const start = Math.max(2, current_page - 1);
            const end = Math.min(last_page - 1, current_page + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (current_page < last_page - 2) {
                pages.push('ellipsis');
            }

            // Toujours afficher la dernière page
            pages.push(last_page);
        }

        return pages;
    };

    if (last_page <= 1) {
        return null; // Pas besoin de pagination avec une seule page
    }

    return (
        <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
            {/* Info et sélecteur per_page */}
            <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                    {from && to ? (
                        <>
                            Affichage de <span className="font-medium">{from}</span> à{' '}
                            <span className="font-medium">{to}</span> sur{' '}
                            <span className="font-medium">{total}</span> résultats
                        </>
                    ) : (
                        <>
                            <span className="font-medium">{total}</span> résultat{total > 1 ? 's' : ''}
                        </>
                    )}
                </p>

                {showPerPageSelector && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Par page:</span>
                        <Select value={String(per_page)} onValueChange={changePerPage}>
                            <SelectTrigger className="h-8 w-16">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {perPageOptions.map((option) => (
                                    <SelectItem key={option} value={String(option)}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Boutons de navigation */}
            <div className="flex items-center gap-1">
                {/* Première page */}
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => goToPage(1)}
                    disabled={current_page === 1}
                    aria-label="Première page"
                >
                    <ChevronsLeft className="size-4" />
                </Button>

                {/* Page précédente */}
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => goToPage(current_page - 1)}
                    disabled={current_page === 1}
                    aria-label="Page précédente"
                >
                    <ChevronLeft className="size-4" />
                </Button>

                {/* Numéros de page */}
                <div className="hidden items-center gap-1 sm:flex">
                    {getPageNumbers().map((page, index) =>
                        page === 'ellipsis' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                                ...
                            </span>
                        ) : (
                            <Button
                                key={page}
                                variant={page === current_page ? 'default' : 'outline'}
                                size="icon"
                                className="size-8"
                                onClick={() => goToPage(page)}
                            >
                                {page}
                            </Button>
                        )
                    )}
                </div>

                {/* Indicateur mobile (page actuelle) */}
                <div className="flex items-center gap-1 sm:hidden">
                    <span className="px-3 text-sm">
                        Page {current_page} / {last_page}
                    </span>
                </div>

                {/* Page suivante */}
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => goToPage(current_page + 1)}
                    disabled={current_page === last_page}
                    aria-label="Page suivante"
                >
                    <ChevronRight className="size-4" />
                </Button>

                {/* Dernière page */}
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => goToPage(last_page)}
                    disabled={current_page === last_page}
                    aria-label="Dernière page"
                >
                    <ChevronsRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
