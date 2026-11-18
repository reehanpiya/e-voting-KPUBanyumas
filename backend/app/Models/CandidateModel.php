<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

final class CandidateModel extends Model
{
    protected $table            = 'candidates';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'number',
        'name',
        'photo_url',
        'vision',
        'mission',
        'program',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
