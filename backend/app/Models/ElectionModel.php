<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

final class ElectionModel extends Model
{
    protected $table            = 'elections';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'status',
        'is_registration_open',
        'school_name',
        'npsn',
        'contact_name',
        'contact_phone',
        'contact_email',
        'start_time',
        'end_time',
        'dpt_locked_at',
        'candidates_locked_at',
        'report_downloaded_at',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Get the active single-tenant election session.
     *
     * @return array<string, mixed>|null
     */
    public function getActiveSession(): ?array
    {
        return $this->orderBy('id', 'ASC')->first();
    }
}
