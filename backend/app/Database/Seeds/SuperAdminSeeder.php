<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use App\Models\ElectionModel;
use App\Models\UserModel;
use CodeIgniter\Database\Seeder;

final class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $username = trim((string) env('SUPER_ADMIN_USERNAME')) ?: 'superadmin';
        $email    = trim((string) env('SUPER_ADMIN_EMAIL')) ?: 'admin@kpu-banyumas.go.id';
        $password = trim((string) env('SUPER_ADMIN_PASSWORD')) ?: 'KpuBanyumas2026!';

        $userModel = new UserModel();

        // 1. Seed or update Super Admin user
        $existingAdmin = $userModel->where('role', UserModel::ROLE_SUPER_ADMIN)->first();

        if ($existingAdmin === null && $email !== '') {
            $existingAdmin = $userModel->findByUsernameOrEmail($email);
        }

        $adminData = [
            'name'          => 'Super Admin KPU Banyumas',
            'username'      => $username,
            'email'         => $email,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'role'          => UserModel::ROLE_SUPER_ADMIN,
            'is_primary'    => true,
            'election_id'   => null,
        ];

        if ($existingAdmin !== null) {
            $userModel->update($existingAdmin['id'], $adminData);
        } else {
            $userModel->insert($adminData);
        }

        // 2. Ensure default initial election session exists with status READY
        $electionModel  = new ElectionModel();
        $activeElection = $electionModel->getActiveSession();

        if ($activeElection === null) {
            $electionModel->insert([
                'status'               => 'READY',
                'is_registration_open' => false,
                'school_name'          => null,
                'npsn'                 => null,
                'contact_name'         => null,
                'contact_phone'        => null,
                'contact_email'        => null,
                'start_time'           => null,
                'end_time'             => null,
            ]);
        }
    }
}
