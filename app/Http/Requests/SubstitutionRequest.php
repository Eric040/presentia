<?php

namespace App\Http\Requests;

use App\Enums\Role;
use App\Models\Substitution;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubstitutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $substitution = $this->route('substitution');

        return $substitution
            ? $this->user()->can('update', $substitution)
            : $this->user()->can('create', Substitution::class);
    }

    public function rules(): array
    {
        $current = $this->route('substitution');

        return [
            'substitute_id' => [
                'required',
                'integer',
                Rule::notIn([$this->user()->id]),
                Rule::exists('users', 'id')
                    ->where('active', true)
                    ->whereNot('role', Role::Administrator->value),
            ],
            'order' => [
                'required',
                'integer',
                Rule::in([1, 2]),
                Rule::unique('substitutions')
                    ->where('delegator_id', $this->user()->id)
                    ->ignore($current?->id),
            ],
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date', Rule::when($this->filled('start'), 'after:start')],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $mustBeHr = (int) $this->input('order') === 1;
                $isHr = User::whereKey($this->input('substitute_id'))
                    ->where('role', Role::Hr->value)
                    ->exists();

                if ($mustBeHr && ! $isHr) {
                    $validator->errors()->add('substitute_id', 'Le suppléant de rang 1 doit appartenir aux ressources humaines.');
                }
            },
        ];
    }
}
