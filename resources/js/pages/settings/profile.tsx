import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';
import { useState } from 'react';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const getPhotoUrl = () => {
        if (photoPreview) return photoPreview;
        if (auth.user.profile_photo_path) {
            return `/storage/${auth.user.profile_photo_path}`;
        }
        return undefined;
    };

    return (
        <>
            <Head title="Paramètres du profil" />

            <h1 className="sr-only">Paramètres du profil</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profil"
                    description="Mettez à jour votre nom, adresse e-mail et photo de profil"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex items-center gap-6">
                                <div className="relative h-20 w-20 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                    {getPhotoUrl() ? (
                                        <img
                                            src={getPhotoUrl()}
                                            alt="Photo de profil"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-neutral-400">
                                            {auth.user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label
                                        htmlFor="profile_photo"
                                        className="cursor-pointer text-sm font-medium text-foreground hover:underline"
                                    >
                                        Choisir une nouvelle photo
                                    </Label>
                                    <Input
                                        id="profile_photo"
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg,image/webp"
                                        className="hidden"
                                        name="profile_photo"
                                        onChange={handlePhotoChange}
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        JPEG, PNG ou WebP. 2 Mo maximum.
                                    </p>
                                    {errors.profile_photo && (
                                        <InputError
                                            className="mt-2"
                                            message={errors.profile_photo}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Nom complet</Label>
                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Nom complet"
                                />
                                <InputError className="mt-2" message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Adresse e-mail"
                                />
                                <InputError className="mt-2" message={errors.email} />
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div>
                                    <p className="-mt-4 text-sm text-muted-foreground">
                                        Votre adresse e-mail n'est pas vérifiée.{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                        >
                                            Cliquez ici pour renvoyer l'e-mail de vérification.
                                        </Link>
                                    </p>

                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-sm font-medium text-green-600">
                                            Un nouveau lien de vérification a été envoyé à votre adresse e-mail.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <Button disabled={processing} data-test="update-profile-button">
                                    Enregistrer
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Paramètres du profil',
            href: edit(),
        },
    ],
};
