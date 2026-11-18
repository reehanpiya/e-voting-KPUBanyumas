<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

final class VotingTokenModel extends Model
{
    public const STATUS_UNUSED = 'unused';
    public const STATUS_USED   = 'used';

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
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
