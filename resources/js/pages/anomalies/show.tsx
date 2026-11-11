import { Head, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Check, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
    processed_at: string | null;
};

type Props = { anomaly: Anomaly };

// =========================
// DONNÉES
// =========================

const statusConfig: Record<AnomalyStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    to_process: { label: 'À traiter', variant: 'destructive' },
    validated:  { label: 'Validée',   variant: 'default' },
    rejected:   { label: 'Rejetée',   variant: 'outline' },
};

// =========================
// HELPERS
// =========================

const textareaClass =
    'border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'long' });

const fmtDT = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// =========================
// PAGE
// =========================

export default function Show({ anomaly }: Props) {
    const [justText, setJustText]       = useState(anomaly.justification ?? '');
    const [decision, setDecision]       = useState<'validated' | 'rejected'>('validated');
    const [processing, setProcessing]   = useState(false);
    const [justifying, setJustifying]   = useState(false);

    const submitJustification = () => {
        router.patch(
            `/anomalies/${anomaly.id}/justify`,
            { justification: justText },
            { onSuccess: () => setJustifying(false) },
        );
    };

    const submitDecision = () => {
        router.patch(
            `/anomalies/${anomaly.id}/process`,
            { decision },
            { onSuccess: () => setProcessing(false) },
        );
    };

    return (
        <>
            <Head title={`Anomalie #${anomaly.id}`} />
            <div className="flex flex-col gap-6 p-4 lg:p-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.get('/anomalies')}>
                        <ArrowLeft className="size-4" /> Retour aux anomalies
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-muted-foreground" />
                            Anomalie #{anomaly.id}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Employé</p>
                            <p className="mt-0.5">{anomaly.user?.name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Type</p>
                            <p className="mt-0.5">{anomaly.type_label}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Date</p>
                            <p className="mt-0.5">{fmtDate(anomaly.date)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Statut</p>
                            <div className="mt-0.5">
                                <Badge variant={statusConfig[anomaly.status].variant}>
                                    {statusConfig[anomaly.status].label}
                                </Badge>
                            </div>
                        </div>
                        {anomaly.processor && (
                            <>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Traité par</p>
                                    <p className="mt-0.5">{anomaly.processor.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Traité le</p>
                                    <p className="mt-0.5">{fmtDT(anomaly.processed_at)}</p>
                                </div>
                            </>
                        )}

                        {anomaly.justification && (
                            <div className="sm:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground">Justification</p>
                                <p className="mt-1 rounded-md bg-muted px-3 py-2 leading-relaxed text-sm">
                                    {anomaly.justification}
                                </p>
                            </div>
                        )}

                        <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
                            {anomaly.status === 'to_process' && (
                                <Button variant="outline" onClick={() => setJustifying(true)}>
                                    Justifier
                                </Button>
                            )}
                            {anomaly.status === 'to_process' && (
                                <Button onClick={() => setProcessing(true)}>
                                    Traiter
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Dialog : Justification ── */}
            <Dialog open={justifying} onOpenChange={setJustifying}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justifier l'anomalie</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label>Justification</Label>
                        <textarea
                            className={textareaClass}
                            value={justText}
                            onChange={(e) => setJustText(e.target.value)}
                            placeholder="Expliquez la raison de l'anomalie"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setJustifying(false)}>Fermer</Button>
                        <Button onClick={submitJustification} disabled={! justText.trim()}>
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : Traitement ── */}
            <Dialog open={processing} onOpenChange={setProcessing}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Traiter l'anomalie</DialogTitle>
                    </DialogHeader>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessing(false)}>Fermer</Button>
                        <Button onClick={submitDecision}>Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Anomalies', href: '/anomalies' },
        { title: 'Détail' },
    ],
};
