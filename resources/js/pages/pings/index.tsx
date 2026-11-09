import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, BellRing, Check, MoreVertical, X } from 'lucide-react';

interface PresencePing {
    id: number;
    user: {
        name: string;
    };
    sent_at: string;
    responded_at: string | null;
    status: 'pending' | 'responded' | 'undeliverable';
}

interface PageProps {
    pings: PresencePing[];
    stats: {
        total: number;
        pending: number;
        responded: number;
        undeliverable: number;
    };
}

export default function PingsIndex({ pings, stats }: PageProps) {
    const getStatusBadge = (status: string) => {
        const variants = {
            pending: 'secondary',
            responded: 'default',
            undeliverable: 'destructive',
        } as const;

        const icons = {
            pending: <BellRing className="size-3.5" />,
            responded: <Check className="size-3.5" />,
            undeliverable: <X className="size-3.5" />,
        };

        const labels = {
            pending: 'En attente',
            responded: 'Répondu',
            undeliverable: 'Non livrable',
        };

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="gap-1.5">
                {icons[status as keyof typeof icons]}
                {labels[status as keyof typeof labels]}
            </Badge>
        );
    };

    const formatDateTime = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            <Head title="Pings de présence" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                {/* Stats Cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <Bell className="size-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">En attente</p>
                                    <p className="text-2xl font-bold">{stats.pending}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <BellRing className="size-6 text-warning" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Répondu</p>
                                    <p className="text-2xl font-bold">{stats.responded}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <Check className="size-6 text-success" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Non livrable</p>
                                    <p className="text-2xl font-bold">{stats.undeliverable}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <X className="size-6 text-destructive" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Pings de présence</CardTitle>
                                <CardDescription>
                                    Suivez les notifications de présence envoyées aux employés
                                </CardDescription>
                            </div>
                            <Button>
                                <BellRing className="size-4 mr-2" />
                                Envoyer un ping
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead>Envoyé le</TableHead>
                                        <TableHead>Répondu le</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                Aucun ping de présence trouvé
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pings.map((ping) => (
                                            <TableRow key={ping.id}>
                                                <TableCell className="font-medium">{ping.user.name}</TableCell>
                                                <TableCell>{formatDateTime(ping.sent_at)}</TableCell>
                                                <TableCell>{formatDateTime(ping.responded_at)}</TableCell>
                                                <TableCell>{getStatusBadge(ping.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="size-4" />
                                                                <span className="sr-only">Ouvrir le menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {ping.status === 'pending' && (
                                                                <DropdownMenuItem>
                                                                    <Check className="size-4 mr-2 text-success" />
                                                                    Marquer comme répondu
                                                                </DropdownMenuItem>
                                                            )}
                                                            {ping.status === 'pending' && (
                                                                <DropdownMenuItem>
                                                                    <X className="size-4 mr-2 text-destructive" />
                                                                    Marquer non livrable
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PingsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Pings de présence',
            href: '/pings',
        },
    ],
};
