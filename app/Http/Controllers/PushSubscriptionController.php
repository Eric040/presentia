<?php

namespace App\Http\Controllers;

use App\Enums\PushSubscriptionState;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PushSubscriptionController extends Controller
{
    public function store(Request $request): Response
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:2000'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
            'device' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $hash = hash('sha256', $data['endpoint']);

        // Un même navigateur ne peut appartenir qu'à un compte : l'empreinte est unique.
        PushSubscription::where('endpoint_hash', $hash)->where('user_id', '!=', $user->id)->delete();

        $subscription = $user->pushSubscriptions()->firstOrNew(['endpoint_hash' => $hash]);
        $subscription->fill([
            'device' => $data['device'] ?? null,
            'endpoint' => $data['endpoint'],
            'public_key' => $data['keys']['p256dh'],
            'auth_token' => $data['keys']['auth'],
        ]);
        $subscription->state = PushSubscriptionState::Active;
        $subscription->save();

        return response()->noContent();
    }

    public function destroy(Request $request, PushSubscription $pushSubscription): Response
    {
        abort_unless($pushSubscription->user_id === $request->user()->id, 403);

        $pushSubscription->state = PushSubscriptionState::Revoked;
        $pushSubscription->save();

        return response()->noContent();
    }
}
