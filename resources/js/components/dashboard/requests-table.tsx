import { Link } from '@inertiajs/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type Row = {
    id: number;
    user: string | null;
    type: string;
    date: string;
    status: string;
    approver: string | null;
};

type Props = { rows: Row[]; title: string; description: string; showUser?: boolean };

const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Approuvée: 'default',
    'En attente': 'secondary',
    Refusée: 'destructive',
};

export function RequestsTable({ rows, title, description, showUser = false }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                <CardAction>
                    <Button asChild size="sm" variant="outline">
                        <Link href="/leave-requests">Voir tout</Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {showUser && <TableHead>Demandeur</TableHead>}
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                            {!showUser && <TableHead>Validateur</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    Aucune demande
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                {showUser && <TableCell className="font-medium">{row.user}</TableCell>}
                                <TableCell className={showUser ? '' : 'font-medium'}>{row.type}</TableCell>
                                <TableCell>{new Date(row.date).toLocaleDateString('fr-FR')}</TableCell>
                                <TableCell>
                                    <Badge variant={variants[row.status] ?? 'outline'}>{row.status}</Badge>
                                </TableCell>
                                {!showUser && <TableCell className="text-muted-foreground">{row.approver ?? '—'}</TableCell>}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}