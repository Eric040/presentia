import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, CheckCircle2, Clock, MoreVertical, XCircle } from 'lucide-react';

interface RestDay {
    id: number;
    user: {
        name: string;
    };
    type: string;
    date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

interface PageProps {
    restDays: RestDay[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

export default function RestDaysIndex({ restDays, stats }: PageProps) {
    const getStatusBadge = (status: string) => {
        const variants = {
            pending: 'secondary',
            approved: 'default',
            rejected: 'destructive',
            cancelled: 'outline',
        } as const;

        const icons = {
            pending: <Clock className="size-3.5" />,
            approved: <CheckCircle2 className="size-3.5" />,
            rejected: <XCircle className="size-3.5" />,
            cancelled: <XCircle className="size-3.5" />,
        };

        const labels = {
            pending: 'En attente',
            approved: 'Approuvé',
            rejected: 'Rejeté',
            cancelled: 'Annulé',
        };

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="gap-1.5">
                {icons[status as keyof typeof icons]}
                {labels[status as keyof typeof labels]}
            </Badge>
        );
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <>
            <Head title="Jours de repos" />
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
                                    <Calendar className="size-6" />
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
                                    <Clock className="size-6 text-warning" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Approuvés</p>
                                    <p className="text-2xl font-bold">{stats.approved}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <CheckCircle2 className="size-6 text-success" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Rejetés</p>
                                    <p className="text-2xl font-bold">{stats.rejected}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <XCircle className="size-6 text-destructive" />
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
                                <CardTitle>Jours de repos</CardTitle>
                                <CardDescription>
                                    Gérez les jours de repos (RTT, jours fériés, etc.) de l'équipe
                                </CardDescription>
                            </div>
                            <Button>
                                <Calendar className="size-4 mr-2" />
                                Nouveau jour de repos
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Raison</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {restDays.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                Aucun jour de repos trouvé
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        restDays.map((restDay) => (
                                            <TableRow key={restDay.id}>
                                                <TableCell className="font-medium">{restDay.user.name}</TableCell>
                                                <TableCell>{restDay.type}</TableCell>
                                                <TableCell>{formatDate(restDay.date)}</TableCell>
                                                <TableCell className="max-w-xs truncate">{restDay.reason}</TableCell>
                                                <TableCell>{getStatusBadge(restDay.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="size-4" />
                                                                <span className="sr-only">Ouvrir le menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {restDay.status === 'pending' && (
                                                                <>
                                                                    <DropdownMenuItem>
                                                                        <CheckCircle2 className="size-4 mr-2 text-success" />
                                                                        Approuver
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem>
                                                                        <XCircle className="size-4 mr-2 text-destructive" />
                                                                        Rejeter
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                </>
                                                            )}
                                                            {restDay.status === 'pending' && (
                                                                <DropdownMenuItem>
                                                                            Annuler
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

RestDaysIndex.layout = {
    breadcrumbs: [
        {
            title: 'Jours de repos',
            href: '/rest-days',
        },
    ],
};
