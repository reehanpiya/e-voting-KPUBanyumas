<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class VotingTokenModel extends Model
{
    protected $table            = 'voting_tokens';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'token',
        'voter_id',
        'status',
        'created_at',
        'updated_at',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Cari token berdasarkan voter_id
     */
    public function findByVoterId(int $voterId): ?array
    {
        return $this->where('voter_id', $voterId)
            ->orderBy('id', 'DESC')
            ->first();
    }

    /**
     * Cari token aktif (unused) berdasarkan string token
     */
    public function findUnusedToken(string $token): ?array
    {
        return $this->where('token', $token)
            ->where('status', 'unused')
            ->first();
    }
}
