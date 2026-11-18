<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

/**
 * BallotModel - Anonymous Ballot Records.
 *
 * CRITICAL ZERO-KNOWLEDGE PRINCIPLE:
 * Strictly no voter ID, no token ID, and no precision timestamp.
 */
final class BallotModel extends Model
{
    protected $table            = 'ballots';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = false;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'id',
        'candidate_id',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = false;

    // No timestamps to prevent timing correlation attacks
    protected $useTimestamps = false;
}
