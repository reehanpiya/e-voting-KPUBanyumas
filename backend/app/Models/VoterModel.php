<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

final class VoterModel extends Model
{
    protected $table            = 'voters';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'nisn',
        'name',
        'class',
        'birth_date',
        'has_voted',
        'voted_at',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Find voter by NISN and birth date.
     *
     * @return array<string, mixed>|null
     */
    public function findByNisnAndDob(string $nisn, string $birthDate): ?array
    {
        return $this->where('nisn', $nisn)
            ->where('birth_date', $birthDate)
            ->first();
    }
}
