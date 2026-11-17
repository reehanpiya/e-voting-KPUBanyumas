<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class BallotModel extends Model
{
    protected $table            = 'ballots';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $protectFields    = true;
    protected $allowedFields    = [
        'id',
        'candidate_id',
    ];

    // Sesuai prinsip Zero-Knowledge Ballots: Tidak ada created_at/updated_at di tabel ballots
    protected $useTimestamps = false;
}
