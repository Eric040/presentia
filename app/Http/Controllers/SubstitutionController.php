<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubstitutionRequest;
use App\Models\ActivityLog;
use App\Models\Substitution;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SubstitutionController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Substitution::class);

        return Inertia::render('substitutions/index', [
            'substitutions' => $request->user()
                ->substitutions()
                ->with('substitute:id,name')
                ->orderBy('order')
                ->get(),
        ]);
    }

    public function store(SubstitutionRequest $request): RedirectResponse
    {
        $substitution = $request->user()->substitutions()->create([
            ...$request->validated(),
            'scope' => 'validations',
        ]);

        ActivityLog::record('substitution.created', $substitution, null, $this->snapshot($substitution));

        return back();
    }

    public function update(SubstitutionRequest $request, Substitution $substitution): RedirectResponse
    {
        $before = $this->snapshot($substitution);

        $substitution->update($request->validated());

        ActivityLog::record('substitution.updated', $substitution, $before, $this->snapshot($substitution));

        return back();
    }

    public function destroy(Substitution $substitution): RedirectResponse
    {
        Gate::authorize('delete', $substitution);

        $before = $this->snapshot($substitution);
        $substitution->delete();

        ActivityLog::record('substitution.deleted', $substitution, $before, null);

        return back();
    }

    // Valeurs simples uniquement : le hachage du journal doit rester stable après relecture en base.
    private function snapshot(Substitution $substitution): array
    {
        return [
            'substitute_id' => $substitution->substitute_id,
            'order' => $substitution->order,
            'start' => $substitution->start?->toDateTimeString(),
            'end' => $substitution->end?->toDateTimeString(),
        ];
    }
}
