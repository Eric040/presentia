<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\InternalNotification;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $query = User::with('service')
            ->orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
        }

        $perPage = $request->input('per_page', 20);
        $users = $query->paginate($perPage)->through(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'identifier' => $u->identifier,
            'role' => $u->role->value,
            'role_label' => $u->role->label(),
            'service' => $u->service ? ['id' => $u->service->id, 'name' => $u->service->name] : null,
            'rest_quota' => $u->rest_quota,
            'active' => $u->active,
        ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'services' => Service::orderBy('name')->get(['id', 'name']),
            'roles' => collect(Role::cases())->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()]),
            'filters' => $request->only('role', 'service_id', 'active'),
            'canCreate' => Auth::user()->can('create', User::class),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|max:255|unique:users,email',
            'identifier' => 'nullable|string|max:60|unique:users,identifier',
            'role'       => ['required', Rule::in(array_column(Role::cases(), 'value'))],
            'service_id' => 'nullable|exists:services,id',
            'manager_id' => 'nullable|exists:users,id',
            'rest_quota' => 'required|integer|min:0|max:31',
            'password'   => 'required|string|min:12',
        ]);

        /** @var User $user */
        $user = User::create([
            'name'                => $validated['name'],
            'email'               => $validated['email'],
            'identifier'          => $validated['identifier'] ?? null,
            'role'                => $validated['role'],
            'service_id'          => $validated['service_id'] ?? null,
            'manager_id'          => $validated['manager_id'] ?? null,
            'rest_quota'          => $validated['rest_quota'],
            'password'            => Hash::make($validated['password']),
            'must_change_password' => true,
            'active'              => true,
        ]);

        // If the new employee has a rest quota, send an internal notification
        // to remind them to submit their rest day proposals.
        if ($user->rest_quota > 0) {
            $user->internalNotifications()->create([
                'type'            => 'rest_day_reminder',
                'channel'         => 'application',
                'minimal_content' => "Bienvenue ! Vous avez droit à {$user->rest_quota} jour(s) de repos ce mois-ci. Pensez à soumettre vos propositions.",
                'data'            => ['rest_quota' => $user->rest_quota],
            ]);
        }

        return back();
    }

    public function updateQuota(Request $request, User $user)
    {
        $this->authorize('manageQuota', $user);

        $validated = $request->validate([
            'rest_quota' => 'required|integer|min:0|max:31',
        ]);

        $user->update(['rest_quota' => $validated['rest_quota']]);

        return back();
    }

    public function updateRole(Request $request, User $user)
    {
        $this->authorize('changeRole', $user);

        $validated = $request->validate([
            'role' => ['required', Rule::in(array_column(Role::cases(), 'value'))],
        ]);

        // Prevent setting to administrator via this endpoint (admin is protected)
        if ($validated['role'] === Role::Administrator->value) {
            abort(403, 'Le rôle administrateur ne peut pas être attribué via cette interface.');
        }

        $user->update(['role' => $validated['role']]);

        return back();
    }

    public function updateService(Request $request, User $user)
    {
        $this->authorize('manageService', $user);

        $validated = $request->validate([
            'service_id' => 'nullable|exists:services,id',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $user->update([
            'service_id' => $validated['service_id'] ?? null,
            'manager_id' => $validated['manager_id'] ?? null,
        ]);

        return back();
    }

    public function deactivate(User $user)
    {
        $this->authorize('deactivate', $user);

        $user->update(['active' => false]);

        return back();
    }

    public function activate(User $user)
    {
        $this->authorize('deactivate', $user); // same gate: admin only

        $user->update(['active' => true]);

        return back();
    }
}
