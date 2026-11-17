<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\I18n\Time;

class ActivateElectionSeeder extends Seeder
{
    public function run(): void
    {
        $now = Time::now()->toDateTimeString();

        // Ubah status pemilu aktif menjadi ACTIVE agar pemungutan suara bisa dimulai
        $existing = $this->db->table('elections')->get()->getFirstRow();

        if ($existing) {
            $this->db->table('elections')->where('id', $existing->id)->update([
                'status'     => 'ACTIVE',
                'updated_at' => $now,
            ]);
            echo "Status pemilu berhasil diubah menjadi ACTIVE!\n";
        } else {
            echo "Tidak ada pemilu yang ditemukan untuk diaktifkan.\n";
        }
    }
}
