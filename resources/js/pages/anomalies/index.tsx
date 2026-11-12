import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Check, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// =========================
// TYPES
// =========================

type AnomalyStatus = 'to_process' | 'validated' | 'rejected';

type Anomaly = {
    id: number;
    user: { id: number; name: string } | null;
    type: string;
    type_label: string;
    date: string;
    status: AnomalyStatus;
    justification: string | null;
    processor: { id: number; name: string } | null;
    can_justify: boolean;
    can_process: boolean;
};

type Props = {
    anomalies: Anomaly[];
    stats: { total: number; pending: number; justified: number; processed: number };
    filters: { status?: string };
};

// =========================
// DONNÉES
// =========================

const statusConfig: Record<AnomalyStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    to_process: { label: 'À traiter',   variant: 'destructive' },
    validated:  { label: 'Validée',     variant: 'default' },
    rejected:   { label: 'Rejetée',     variant: 'outline' },
};

// =========================
// HELPERS
// =========================

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' });

const textareaClass =
    'border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

const Err = ({ text }: { text?: string }) =>
    text ? <p className="mt-1 text-sm text-destructive">{text}</p> : null;

// =========================
// PAGE
// =========================

export default function Index({ anomalies, stats, filters }: Props) {
    const page = usePage<{ errors: Record<string, string> }>();
    const { errors } = page.props;

    const [justifying, setJustifying]   = useState<Anomaly | null>(null);
    const [processing, setProcessing]   = useState<Anomaly | null>(null);
    const [justText, setJustText]       = useState('');
    const [decision, setDecision]       = useState<'validated' | 'rejected'>('validated');
    const [viewing, setViewing]         = useState<Anomaly | null>(null);

    const filter = (value: string) =>
        router.get(
            '/anomalies',
            { status: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );

    const submitJustification = () => {
        if (! justifying) return;
        router.patch(
            `/anomalies/${justifying.id}/justify`,
            { justification: justText },
            {
                preserveScroll: true,
                onSuccess: () => { setJustifying(null); setJustText(''); },
            },
        );
    };

    const submitDecision = () => {
        if (! processing) return;
        router.patch(
            `/anomalies/${processing.id}/process`,
            { decision },
            {
                preserveScroll: true,
                onSuccess: () => { setProcessing(null); setDecision('validated'); },
            },
        );
    };

    const cards = [
        { label: 'Total',      value: stats.total },
        { label: 'À traiter',  value: stats.pending },
        { label: 'Justifiées', value: stats.justified },
        { label: 'Traitées',   value: stats.processed },
    ];

    return (
        <>
            <Head title="Anomalies" />
            <div className="flex flex-col gap-6 p-4 lg:p-6">

                {/* Stats */}
                <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((c) => (
                        <Card key={c.label}>
                            <CardHeader>
                                <CardDescription>{c.label}</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums">
                                    {c.value}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Anomalies de présence</CardTitle>
                        <CardDescription>Pings manqués, hors zone, sessions incomplètes</CardDescription>
                        <CardAction>
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={filter}
                            >
                                <SelectTrigger size="sm" className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="to_process">À traiter</SelectItem>
                                    <SelectItem value="validated">Validées</SelectItem>
                                    <SelectItem value="rejected">Rejetées</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employé</TableHead>
                                        <TableHead className="hidden sm:table-cell">Type</TableHead>
                                        <TableHead className="hidden md:table-cell">Date</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="hidden lg:table-cell">Justification</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {anomalies.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-center text-muted-foreground"
                                            >
                                                Aucune anomalie
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {anomalies.map((a) => (
                                        <TableRow
                                            key={a.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setViewing(a)}
                                        >
                                            <TableCell className="font-medium">
                                                {a.user?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <div className="flex items-center gap-1.5">
                                                    <AlertTriangle className="size-3.5 text-muted-foreground" />
                                                    {a.type_label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{fmtDate(a.date)}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusConfig[a.status].variant}>
                                                    {statusConfig[a.status].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell max-w-xs">
                                                {a.justification ? (
                                                    <p className="truncate text-sm text-muted-foreground">
                                                        {a.justification}
                                                    </p>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="flex justify-end gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {a.can_justify && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setJustifying(a);
                                                                setJustText(a.justification ?? '');
                                                            }}
                                                        >
                                                            Justifier
                                                        </Button>
                                                    )}
                                                    {a.can_process && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setProcessing(a)}
                                                        >
                                                            Traiter
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Dialog : Justification ── */}
            <Dialog
                open={justifying !== null}
                onOpenChange={(open) => { if (!open) { setJustifying(null); setJustText(''); } }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justifier l'anomalie</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                        {justifying && (
                            <p className="text-sm text-muted-foreground">
                                {justifying.type_label} — {fmtDate(justifying.date)}
                            </p>
                        )}
                        <Label>Justification</Label>
                        <textarea
                            className={textareaClass}
                            value={justText}
                            onChange={(e) => setJustText(e.target.value)}
                            placeholder="Expliquez la raison de l'anomalie (panne, GPS défaillant…)"
                        />
                        <Err text={errors.justification} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setJustifying(null)}>
                            Fermer
                        </Button>
                        <Button
                            onClick={submitJustification}
                            disabled={! justText.trim()}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Traitement ── */}
            <Dialog
                open={processing !== null}
                onOpenChange={(open) => !open && setProcessing(null)}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Traiter l'anomalie</DialogTitle>
                    </DialogHeader>
                    {processing && (
                        <div className="grid gap-4">
                            <p className="text-sm text-muted-foreground">
                                {processing.type_label} — {processing.user?.name} — {fmtDate(processing.date)}
                            </p>
                            {processing.justification && (
                                <div>
                                    <Label>Justification de l'employé</Label>
                                    <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
                                        {processing.justification}
                                    </p>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>Décision</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={decision === 'validated' ? 'default' : 'outline'}
                                        onClick={() => setDecision('validated')}
                                        className="flex-1"
                                    >
                                        <Check className="size-4" /> Valider
                                    </Button>
                                    <Button
                                        variant={decision === 'rejected' ? 'destructive' : 'outline'}
                                        onClick={() => setDecision('rejected')}
                                        className="flex-1"
                                    >
                                        <X className="size-4" /> Rejeter
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessing(null)}>
                            Fermer
                        </Button>
                        <Button onClick={submitDecision}>
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Détail ── */}
            <Dialog
                open={viewing !== null}
                onOpenChange={(open) => !open && setViewing(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Détail de l'anomalie</DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <div className="grid gap-4 text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Employé</p>
                                    <p className="mt-0.5">{viewing.user?.name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Type</p>
                                    <p className="mt-0.5">{viewing.type_label}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Date</p>
                                    <p className="mt-0.5">{fmtDate(viewing.date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Statut</p>
                                    <div className="mt-0.5">
                                        <Badge variant={statusConfig[viewing.status].variant}>
                                            {statusConfig[viewing.status].label}
                                        </Badge>
                                    </div>
                                </div>
                                {viewing.processor && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Traité par</p>
                                        <p className="mt-0.5">{viewing.processor.name}</p>
                                    </div>
                                )}
                            </div>
                            {viewing.justification && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Justification</p>
                                    <p className="mt-1 rounded-md bg-muted px-3 py-2 leading-relaxed">
                                        {viewing.justification}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex-row flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setViewing(null)} className="mr-auto">
                            Fermer
                        </Button>
                        {viewing?.can_justify && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setJustifying(viewing);
                                    setJustText(viewing.justification ?? '');
                                    setViewing(null);
                                }}
                            >
                                Justifier
                            </Button>
                        )}
                        {viewing?.can_process && (
                            <Button
                                onClick={() => { setProcessing(viewing); setViewing(null); }}
                            >
                                Traiter
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Anomalies', href: '/anomalies' }],
};
