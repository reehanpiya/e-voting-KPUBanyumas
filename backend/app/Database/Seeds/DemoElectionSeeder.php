<?php

declare(strict_types=1);

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\I18n\Time;

class DemoElectionSeeder extends Seeder
{
    public function run(): void
    {
        $now = Time::now()->toDateTimeString();

        $data = [
            'status'               => 'SETUP', // Siap untuk impor DPT & input paslon
            'is_registration_open' => false,
            'school_name'          => 'SMA Negeri 1 Banyumas',
            'npsn'                 => '20301234',
            'contact_name'         => 'Bambang Panitia',
            'contact_phone'        => '081234567890',
            'contact_email'        => 'panitia@sman1banyumas.sch.id',
            'start_time'           => Time::now()->addHours(1)->toDateTimeString(),
            'end_time'             => Time::now()->addHours(8)->toDateTimeString(),
            'dpt_locked_at'        => null,
            'candidates_locked_at' => null,
            'report_downloaded_at' => null,
            'created_at'           => $now,
            'updated_at'           => $now,
        ];

        // Cek apakah sudah ada election
        $existing = $this->db->table('elections')->get()->getFirstRow();

        if (! $existing) {
            $this->db->table('elections')->insert($data);
        } else {
            $this->db->table('elections')->where('id', $existing->id)->update([
                'status'               => 'SETUP',
                'school_name'          => 'SMA Negeri 1 Banyumas',
                'dpt_locked_at'        => null,
                'candidates_locked_at' => null,
                'updated_at'           => $now,
            ]);
        }
    }
}
