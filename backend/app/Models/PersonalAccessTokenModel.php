<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

final class PersonalAccessTokenModel extends Model
{
    protected $table            = 'personal_access_tokens';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'user_id',
        'token_hash',
        'expires_at',
        'last_used_at',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Find token record by hash.
     *
     * @return array<string, mixed>|null
     */
    public function findValidToken(string $tokenHash): ?array
    {
        return $this->where('token_hash', $tokenHash)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->first();
    }
}
