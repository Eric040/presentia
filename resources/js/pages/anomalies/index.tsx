import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertTriangle, CheckCircle2, MoreVertical, XCircle } from 'lucide-react';

interface Anomaly {
    id: number;
    user: {
        name: string;
    };
    type: string;
    date: string;
    description: string;
    status: 'pending' | 'justified' | 'processed';
    justification: string | null;
}

interface PageProps {
    anomalies: Anomaly[];
    stats: {
        total: number;
        pending: number;
        justified: number;
        processed: number;
    };
}

export default function AnomaliesIndex({ anomalies, stats }: PageProps) {
    const getStatusBadge = (status: string) => {
        const variants = {
            pending: 'secondary',
            justified: 'default',
            processed: 'outline',
        } as const;

        const icons = {
            pending: <AlertTriangle className="size-3.5" />,
            justified: <CheckCircle2 className="size-3.5" />,
            processed: <CheckCircle2 className="size-3.5" />,
        };

        const labels = {
            pending: 'En attente',
            justified: 'Justifiée',
            processed: 'Traitée',
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
            <Head title="Anomalies" />
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
                                    <AlertTriangle className="size-6" />
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
                                    <AlertTriangle className="size-6 text-warning" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Justifiées</p>
                                    <p className="text-2xl font-bold">{stats.justified}</p>
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
                                    <p className="text-sm font-medium text-muted-foreground">Traitées</p>
                                    <p className="text-2xl font-bold">{stats.processed}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <CheckCircle2 className="size-6 text-muted-foreground" />
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
                                <CardTitle>Anomalies de pointage</CardTitle>
                                <CardDescription>
                                    Gérez les anomalies détectées dans les horaires de l'équipe
                                </CardDescription>
                            </div>
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
                                        <TableHead>Description</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {anomalies.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                Aucune anomalie trouvée
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        anomalies.map((anomaly) => (
                                            <TableRow key={anomaly.id}>
                                                <TableCell className="font-medium">{anomaly.user.name}</TableCell>
                                                <TableCell>{anomaly.type}</TableCell>
                                                <TableCell>{formatDate(anomaly.date)}</TableCell>
                                                <TableCell className="max-w-xs truncate">{anomaly.description}</TableCell>
                                                <TableCell>{getStatusBadge(anomaly.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="size-4" />
                                                                <span className="sr-only">Ouvrir le menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {anomaly.status === 'pending' && (
                                                                <>
                                                                    <DropdownMenuItem>
                                                                        <CheckCircle2 className="size-4 mr-2 text-success" />
                                                                        Justifier
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem>
                                                                        <CheckCircle2 className="size-4 mr-2" />
                                                                        Traiter
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {anomaly.status === 'justified' && (
                                                                <DropdownMenuItem>
                                                                    <CheckCircle2 className="size-4 mr-2" />
                                                                    Traiter
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

AnomaliesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Anomalies',
            href: '/anomalies',
        },
    ],
};
