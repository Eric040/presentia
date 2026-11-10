import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useIsMobile } from '@/hooks/use-mobile';

export type Point = { date: string; value: number };

type Props = { data: Point[]; title: string; label: string };

// =========================
// DONNÉES
// =========================

const ranges: Record<string, { label: string; days: number }> = {
    '90d': { label: '3 derniers mois', days: 90 },
    '30d': { label: '30 derniers jours', days: 30 },
    '7d': { label: '7 derniers jours', days: 7 },
};

const formatDate = (value: string | number | Date) =>
    new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const formatTooltipLabel = (value: string | number | Date) =>
    new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const renderTooltipLabel = (label: React.ReactNode): React.ReactNode => {
    if (typeof label === 'string' || typeof label === 'number' || label instanceof Date) {
        return formatTooltipLabel(label);
    }
    return label;
};

export function ActivityChart({ data, title, label }: Props) {
    // =========================
    // ÉTATS
    // =========================

    const isMobile = useIsMobile();
    const [range, setRange] = useState('90d');
    const config = { value: { label, color: 'var(--primary)' } } satisfies ChartConfig;
    const visible = data.slice(-ranges[range].days);
    const empty = visible.every((point) => point.value === 0);

    // =========================
    // EFFETS
    // =========================

    useEffect(() => {
        if (isMobile) setRange('7d');
    }, [isMobile]);

    // =========================
    // RENDU
    // =========================

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{ranges[range].label}</CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={range}
                        onValueChange={(value) => value && setRange(value)}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
                    >
                        {Object.entries(ranges).map(([key, { label: text }]) => (
                            <ToggleGroupItem key={key} value={key}>
                                {text}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Choisir la période">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {Object.entries(ranges).map(([key, { label: text }]) => (
                                <SelectItem key={key} value={key} className="rounded-lg">
                                    {text}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {empty ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">Aucune donnée sur la période</p>
                ) : (
                    <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
                        <AreaChart data={visible}>
                            <defs>
                                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={1} />
                                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={formatDate} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={renderTooltipLabel} indicator="dot" />} />
                            <Area dataKey="value" type="natural" fill="url(#fillValue)" stroke="var(--color-value)" />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}