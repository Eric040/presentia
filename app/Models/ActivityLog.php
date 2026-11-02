<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['action'])]
class ActivityLog extends Model
{
    protected $table = 'activity_log';

    public $timestamps = false;

    protected $guarded = ['*'];

    // S3.2 : jamais de GPS ni de contenu de message dans le journal.
    private const FORBIDDEN_KEYS = ['latitude', 'longitude', 'lat', 'lng', 'content'];

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('activity_log is append only'));
        static::deleting(fn () => throw new LogicException('activity_log is append only'));
    }

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'timestamp' => 'datetime',
        ];
    }

    public static function record(
        string $action,
        ?Model $related = null,
        ?array $before = null,
        ?array $after = null,
        string $result = 'success',
    ): self {
        return DB::transaction(function () use ($action, $related, $before, $after, $result) {
            $last = static::query()->orderByDesc('id')->lockForUpdate()->first();
            $user = auth()->user();

            $entry = new static;
            $entry->forceFill([
                'author_id' => $user?->id,
                'role' => $user?->role?->value,
                'action' => $action,
                'related_type' => $related ? Str::snake(class_basename($related)) : null,
                'related_id' => $related?->getKey(),
                'before' => static::sanitize($before),
                'after' => static::sanitize($after),
                'timestamp' => now(),
                'ip_address' => request()->ip(),
                'device' => Str::limit((string) request()->userAgent(), 255, ''),
                'result' => $result,
                'previous_hash' => $last?->hash,
            ]);
            $entry->hash = $entry->computeHash();
            $entry->save();

            return $entry;
        });
    }

    public function computeHash(): string
    {
        return hash('sha256', json_encode([
            $this->previous_hash,
            $this->author_id,
            $this->role,
            $this->action,
            $this->related_type,
            $this->related_id,
            static::canonical($this->before),
            static::canonical($this->after),
            $this->timestamp->utc()->format('Y-m-d H:i:s'),
            $this->ip_address,
            $this->device,
            $this->result,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    public static function chainIsValid(): bool
    {
        $previousHash = null;

        foreach (static::query()->orderBy('id')->lazyById() as $entry) {
            if ($entry->previous_hash !== $previousHash || $entry->hash !== $entry->computeHash()) {
                return false;
            }
            $previousHash = $entry->hash;
        }

        return true;
    }

    // MySQL réordonne les clés des colonnes JSON : on trie pour que le hachage reste stable.
    private static function canonical(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        ksort($data);

        return array_map(fn ($v) => is_array($v) ? static::canonical($v) : $v, $data);
    }

    private static function sanitize(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        return collect($data)
            ->except(self::FORBIDDEN_KEYS)
            ->map(fn ($v) => is_array($v) ? static::sanitize($v) : $v)
            ->all();
    }
}