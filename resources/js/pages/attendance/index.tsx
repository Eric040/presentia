import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Clock, Coffee, MoreVertical, Play, Pause } from 'lucide-react';

interface AttendanceSession {
    id: number;
    user: {
        name: string;
    };
    clock_in: string;
    clock_out: string | null;
    break_start: string | null;
    break_end: string | null;
    status: 'active' | 'completed' | 'on_break';
}

interface PageProps {
    sessions: AttendanceSession[];
    stats: {
        active: number;
        completed: number;
        on_break: number;
    };
}

export default function AttendanceIndex({ sessions, stats }: PageProps) {
    const getStatusBadge = (status: string) => {
        const variants = {
            active: 'default',
            completed: 'secondary',
            on_break: 'outline',
        } as const;

        const icons = {
            active: <Play className="size-3.5" />,
            completed: <Clock className="size-3.5" />,
            on_break: <Coffee className="size-3.5" />,
        };

        const labels = {
            active: 'En cours',
            completed: 'Terminé',
            on_break: 'En pause',
        };

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="gap-1.5">
                {icons[status as keyof typeof icons]}
                {labels[status as keyof typeof labels]}
            </Badge>
        );
    };

    const formatTime = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <Head title="Pointage" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-6">
                {/* Stats Cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Actifs</p>
                                    <p className="text-2xl font-bold">{stats.active}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <Play className="size-6 text-success" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">En pause</p>
                                    <p className="text-2xl font-bold">{stats.on_break}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <Coffee className="size-6 text-warning" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Terminés</p>
                                    <p className="text-2xl font-bold">{stats.completed}</p>
                                </div>
                                <div className="bg-secondary rounded-lg p-3">
                                    <Clock className="size-6 text-muted-foreground" />
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
                                <CardTitle>Sessions de pointage</CardTitle>
                                <CardDescription>
                                    Suivez les arrivées, départs et pauses de l'équipe
                                </CardDescription>
                            </div>
                            <Button>
                                <Clock className="size-4 mr-2" />
                                Pointer arrivée
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead>Arrivée</TableHead>
                                        <TableHead>Départ</TableHead>
                                        <TableHead>Pause début</TableHead>
                                        <TableHead>Pause fin</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                Aucune session de pointage trouvée
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sessions.map((session) => (
                                            <TableRow key={session.id}>
                                                <TableCell className="font-medium">{session.user.name}</TableCell>
                                                <TableCell>{formatTime(session.clock_in)}</TableCell>
                                                <TableCell>{formatTime(session.clock_out)}</TableCell>
                                                <TableCell>{formatTime(session.break_start)}</TableCell>
                                                <TableCell>{formatTime(session.break_end)}</TableCell>
                                                <TableCell>{getStatusBadge(session.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="size-4" />
                                                                <span className="sr-only">Ouvrir le menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {session.status === 'active' && (
                                                                <>
                                                                    <DropdownMenuItem>
                                                                        <Pause className="size-4 mr-2" />
                                                                        Démarrer pause
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem>
                                                                        <Clock className="size-4 mr-2" />
                                                                        Pointer départ
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {session.status === 'on_break' && (
                                                                <DropdownMenuItem>
                                                                        <Play className="size-4 mr-2" />
                                                                        Finir pause
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

AttendanceIndex.layout = {
    breadcrumbs: [
        {
            title: 'Pointage',
            href: '/attendance',
        },
    ],
};
