<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class CandidateModel extends Model
{
    protected $table            = 'candidates';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'election_id',
        'number',
        'name',
        'photo_url',
        'vision',
        'mission',
        'program',
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
     * Ambil seluruh kandidat pada sesi pemilu tertentu diurutkan berdasarkan nomor urut
     */
    public function getByElection(?int $electionId = null): array
    {
        $builder = $this->orderBy('number', 'ASC');
        if ($electionId !== null) {
            $builder->where('election_id', $electionId);
        }
        return $builder->findAll();
    }
}
