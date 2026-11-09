import { Form, Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    email: string;
    cooldown: number;
    expiresAt: string;
};

const formatTime = (iso: string) => {
    const date = new Date(iso);
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${date.getHours()}h ${minutes}min`;
};

export default function Otp({ email, cooldown, expiresAt }: Props) {
    // =========================
    // ÉTATS
    // =========================
    const [seconds, setSeconds] = useState(cooldown);
    const [resent, setResent] = useState(false);
    const [error, setError] = useState('');

    // =========================
    // EFFETS
    // =========================
    useEffect(() => {
        setSeconds(cooldown);
    }, [cooldown]);

    useEffect(() => {
        if (seconds <= 0) {
            return;
        }

        const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    // =========================
    // ACTIONS
    // =========================
    const resend = () => {
        setError('');
        router.post('/otp/resend', {}, {
            preserveScroll: true,
            onSuccess: () => setResent(true),
            onError: (errors) => setError(errors.resend ?? ''),
        });
    };

    // =========================
    // RENDU
    // =========================
    return (
        <>
            <Head title="Vérification en deux étapes" />

            <Form action="/otp" method="post" resetOnError className="space-y-6">
                {({ errors, processing }) => (
                    <>
                        <div className="grid gap-2">
                            <Input
                                name="code"
                                inputMode="numeric"
                                maxLength={6}
                                autoComplete="one-time-code"
                                autoFocus
                                placeholder="000000"
                                className="text-center text-lg tracking-widest"
                            />
                            <InputError message={errors.code} />
                        </div>

                        <Button className="w-full" disabled={processing}>
                            Vérifier
                        </Button>
                    </>
                )}
            </Form>

            <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>
                    Code envoyé à {email}. Il expire à {formatTime(expiresAt)}.
                </p>

                <button
                    type="button"
                    onClick={resend}
                    disabled={seconds > 0}
                    className="underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                >
                    {seconds > 0
                        ? `Renvoyer le code dans ${seconds} s`
                        : 'Renvoyer le code'}
                </button>

                {resent && seconds > 0 && <p>Un nouveau code a été envoyé.</p>}
                <InputError message={error} />
            </div>
        </>
    );
}

Otp.layout = {
    title: 'Vérification en deux étapes',
    description: 'Saisissez le code à 6 chiffres reçu par e-mail',
};