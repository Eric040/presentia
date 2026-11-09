import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';

export function ModeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
            className="cursor-pointer"
        >
            {isDark ? (
                <Sun className="size-[1.2rem]" />
            ) : (
                <Moon className="size-[1.2rem]" />
            )}
            <span className="sr-only">
                Basculer en mode {isDark ? 'clair' : 'sombre'}
            </span>
        </Button>
    );
}
