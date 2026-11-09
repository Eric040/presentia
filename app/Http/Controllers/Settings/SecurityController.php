<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/security', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'mustChangePassword' => (bool) $request->user()->must_change_password,
        ]);
    }

    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->password = $request->password;
        $user->must_change_password = false;
        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Password updated.')]);

        return $user->wasChanged('must_change_password')
            ? redirect('/dashboard')
            : back();
    }
}