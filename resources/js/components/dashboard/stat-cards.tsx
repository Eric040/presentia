import { TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

// =========================
// TYPES
// =========================

export type Stat = {
    label: string;
    value: string;
    trend: string;
    up: boolean;
    title: string;
    note: string;
};

interface StatCardsProps {
    stats: Stat[];
}

// =========================
// RENDU
// =========================

export function StatCards({ stats }: StatCardsProps) {
    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
                const Icon = stat.up ? TrendingUp : TrendingDown;

                return (
                    <Card key={stat.label} className="@container/card">
                        <CardHeader>
                            <CardDescription>{stat.label}</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                {stat.value}
                            </CardTitle>
                            <CardAction>
                                <Badge variant="outline">
                                    <Icon />
                                    {stat.trend}
                                </Badge>
                            </CardAction>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1.5 border-t-0 bg-transparent pt-0 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                {stat.title} <Icon className="size-4" />
                            </div>
                            <div className="text-muted-foreground">{stat.note}</div>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}