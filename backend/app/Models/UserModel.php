<?php

declare(strict_types=1);

namespace App\Models;

use CodeIgniter\Model;

final class UserModel extends Model
{
    public const ROLE_SUPER_ADMIN   = 'super_admin';
    public const ROLE_ADMIN_SEKOLAH = 'admin_sekolah';

    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name',
        'username',
        'email',
        'password_hash',
        'role',
        'is_primary',
        'election_id',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Find user by username or email.
     *
     * @return array<string, mixed>|null
     */
    public function findByUsernameOrEmail(string $identifier): ?array
    {
        return $this->groupStart()
            ->where('username', $identifier)
            ->orWhere('email', $identifier)
            ->groupEnd()
            ->first();
    }
}
