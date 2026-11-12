import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/security';
import { useT } from '@/hooks/use-t';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// oxfmt-ignore
type Props = {
    passwordRules: string;
    isAdmin: boolean;
    mustChangePassword: boolean;
};

export default function Security(props: Props) {
    const t = useT();
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title={t('Security settings')} />

            <h1 className="sr-only">{t('Security settings')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('Update password')}
                    description={t('Ensure your account is using a long, random password to stay secure')}
                />

                {props.mustChangePassword && (
                    <Alert className="mb-6 border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
                        <TriangleAlert />
                        <AlertTitle>{t('Password change required')}</AlertTitle>
                        <AlertDescription>
                            {t('For your security, you must change your temporary password before continuing.')}
                            {t("You can't access another page without changing your password.")}
                        </AlertDescription>
                    </Alert>
                )}  

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    {t('Current password')}
                                </Label>

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    placeholder={t('Current password')}
                                />

                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">{t('New password')}</Label>

                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder={t('New password')}
                                    passwordrules={props.passwordRules}
                                />

                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    {t('Confirm password')}
                                </Label>

                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder={t('Confirm password')}
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    {t('Save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Paramètres de sécurité',
            href: edit(),
        },
    ],
};
