import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { leaveRequests } from '@/routes';
import { CheckCircle2, Clock, XCircle, MoreVertical, Plus } from 'lucide-react';

interface LeaveRequest {
    id: number;
    user: {
        name: string;
    };
    type: string;
    start_date: string;
    end_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    created_at: string;
}

interface PageProps {
    leaveRequests: LeaveRequest[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

export default function LeaveRequestsIndex({ leaveRequests: requests, stats }: PageProps) {
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

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="gap-1.5">
                {icons[status as keyof typeof icons]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    return (
        <>
            <Head title="Demandes de congés" />
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
                                    <Clock className="size-6" />
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
                                    <p className="text-sm font-medium text-muted-foreground">Approuvées</p>
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
                                    <p className="text-sm font-medium text-muted-foreground">Rejetées</p>
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
                                <CardTitle>Demandes de congés</CardTitle>
                                <CardDescription>
                                    Gérez toutes les demandes de congés de l'équipe
                                </CardDescription>
                            </div>
                            <Button>
                                <Plus className="size-4 mr-2" />
                                Nouvelle demande
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
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                Aucune demande de congé trouvée
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        requests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell className="font-medium">{request.user.name}</TableCell>
                                                <TableCell>{request.type}</TableCell>
                                                <TableCell>
                                                    {new Date(request.start_date).toLocaleDateString('fr-FR')} -{' '}
                                                    {new Date(request.end_date).toLocaleDateString('fr-FR')}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(request.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="size-4" />
                                                                <span className="sr-only">Ouvrir le menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {request.status === 'pending' && (
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
                                                            {request.status === 'pending' && (
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

LeaveRequestsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Demandes de congés',
            href: leaveRequests(),
        },
    ],
};
