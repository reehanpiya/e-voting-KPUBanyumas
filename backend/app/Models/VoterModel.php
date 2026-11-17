<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

class VoterModel extends Model
{
    protected $table            = 'voters';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'election_id',
        'nisn',
        'name',
        'class',
        'birth_date',
        'has_voted',
        'voted_at',
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
     * Cari pemilih berdasarkan NISN pada sesi pemilu tertentu
     */
    public function findByNisn(string $nisn, ?int $electionId = null): ?array
    {
        $builder = $this->where('nisn', $nisn);
        if ($electionId !== null) {
            $builder->where('election_id', $electionId);
        }
        return $builder->first();
    }
}
