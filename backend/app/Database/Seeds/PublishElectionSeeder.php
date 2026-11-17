<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\I18n\Time;

class PublishElectionSeeder extends Seeder
{
    public function run(): void
    {
        $now = Time::now()->toDateTimeString();

        $existing = $this->db->table('elections')->get()->getFirstRow();

        if ($existing) {
            $this->db->table('elections')->where('id', $existing->id)->update([
                'status'     => 'PUBLISHED',
                'updated_at' => $now,
            ]);
            echo "Status pemilu berhasil diubah menjadi PUBLISHED!\n";
        }
    }
}
