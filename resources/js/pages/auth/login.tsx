import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/hooks/use-t';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

// =========================
// TYPES
// =========================

type Props = {
    status?: string;
    canResetPassword: boolean;
};

// =========================
// PAGE
// =========================

export default function Login({ status, canResetPassword }: Props) {
    const t = useT();

    // =========================
    // RENDU
    // =========================

    return (
        <>
            <Head title={t('Log in')} />

            {/* Sort du conteneur étroit du layout et se recentre */}
            <div className="relative left-1/2 w-[min(56rem,calc(100vw-3rem))] -translate-x-1/2">
                <Card className="overflow-hidden p-0">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        <Form
                            {...store.form()}
                            resetOnSuccess={['password', 'password_confirmation']}
                            disableWhileProcessing
                            className="p-6 md:p-10"
                        >
                            {({ processing, errors }) => (
                                <div className="flex flex-col gap-5">

                                    <div className="text-center">
                                        <h1 className="text-2xl font-bold">
                                            {t('Welcome back')}
                                        </h1>
                                        <p className="text-balance text-sm text-muted-foreground">
                                            {t('Login to your Presentia account')}
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">{t('Email address')}</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="email"
                                            placeholder="email@example.com"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">{t('Password')}</Label>
                                            {canResetPassword && (
                                                <TextLink
                                                    href={request()}
                                                    className="ml-auto text-sm"
                                                    tabIndex={5}
                                                >
                                                    {t('Forgot your password?')}
                                                </TextLink>
                                            )}
                                        </div>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder={t('Password')}
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <Checkbox id="remember" name="remember" tabIndex={3} />
                                        <Label htmlFor="remember">{t('Remember me')}</Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full cursor-pointer"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                    >
                                        {processing && <Spinner />}
                                        {t('Log in')}
                                    </Button>

                                    <p className="text-center text-sm text-muted-foreground">
    {t('No account? Contact your administrator.')}
</p>
                                </div>
                            )}
                        </Form>

                        <div className="hidden flex-col items-center justify-center gap-4 p-10 text-center text-primary-foreground md:flex">
                            <img src="/assets/images/23017.jpg" className="object-cover h-full w-full" alt="Image de présentation de cohésion d'équipe" />
                        </div>
                    </CardContent>
                </Card>
            </div>

        </>
    );
}