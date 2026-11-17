<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\I18n\Time;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $username = env('SUPER_ADMIN_USERNAME', 'superadmin');
        $email    = env('SUPER_ADMIN_EMAIL', 'admin@kpubanyumas.go.id');
        $password = env('SUPER_ADMIN_PASSWORD', 'AdminKPU2026!');

        $now = Time::now()->toDateTimeString();

        $data = [
            'name'          => 'Super Admin KPU',
            'username'      => $username,
            'email'         => $email,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'role'          => 'super_admin',
            'is_primary'    => true,
            'election_id'   => null,
            'created_at'    => $now,
            'updated_at'    => $now,
        ];

        // Cek apakah super admin sudah ada sebelumnya
        $existing = $this->db->table('users')
            ->where('username', $username)
            ->orWhere('role', 'super_admin')
            ->get()
            ->getRow();

        if (! $existing) {
            $this->db->table('users')->insert($data);
        } else {
            $this->db->table('users')
                ->where('id', $existing->id)
                ->update([
                    'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                    'updated_at'    => $now,
                ]);
        }
    }
}
