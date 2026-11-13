<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class OtpController extends Controller
{
    private const EXPIRES_MINUTES = 10;

    private const COOLDOWN_SECONDS = 60;

    public function show(Request $request)
    {
        $user = $request->user();

        if ($request->session()->get('otp_verified')) {
            return redirect('/dashboard');
        }

        if (! $user->otp_expires_at || $user->otp_expires_at->isPast()) {
            $this->send($user);
        }

        return Inertia::render('auth/otp', [
            'email' => $user->email,
            'cooldown' => $this->cooldown($user),
            'expiresAt' => $user->otp_expires_at->toIso8601String(),
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate(['code' => ['required', 'digits:6']]);

        $user = $request->user();

        if ($user->otp_attempts >= 5 || ! $user->otp_expires_at || $user->otp_expires_at->isPast()) {
            return back()->withErrors(['code' => 'Code expiré. Demandez un nouveau code.']);
        }

        if (! Hash::check($request->code, $user->otp_code)) {
            $user->increment('otp_attempts');

            return back()->withErrors(['code' => 'Code incorrect.']);
        }

        $user->forceFill([
            'otp_code' => null,
            'otp_expires_at' => null,
            'otp_attempts' => 0,
        ])->save();

        $request->session()->put('otp_verified', true);

        return redirect('/dashboard');
    }

    public function resend(Request $request)
    {
        $seconds = $this->cooldown($request->user());

        if ($seconds > 0) {
            return back()->withErrors([
                'resend' => "Veuillez patienter {$seconds} secondes avant de demander un nouveau code.",
            ]);
        }

        $this->send($request->user());

        return back();
    }

    private function cooldown($user): int
    {
        if (! $user->otp_expires_at) {
            return 0;
        }

        $sentAt = $user->otp_expires_at->timestamp - self::EXPIRES_MINUTES * 60;

        return max(0, self::COOLDOWN_SECONDS - (now()->timestamp - $sentAt));
    }

    private function send($user): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(self::EXPIRES_MINUTES);

        $user->forceFill([
            'otp_code' => Hash::make($code),
            'otp_expires_at' => $expiresAt,
            'otp_attempts' => 0,
        ])->save();

        try {
            Mail::raw(
                "Votre code de connexion Presentia : {$code}\nIl expire dans 10 minutes à {$expiresAt->format('H')}h {$expiresAt->format('i')}min.",
                fn ($mail) => $mail->to($user->email)->subject('Code de connexion Presentia')
            );
        } catch (\Throwable $e) {
            report($e);

            throw ValidationException::withMessages([
                'code' => "Impossible d'envoyer le code. Contactez le support.",
            ]);
        }
    }
}