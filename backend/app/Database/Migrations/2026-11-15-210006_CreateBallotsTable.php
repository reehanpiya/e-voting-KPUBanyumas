<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;
use CodeIgniter\Database\RawSql;

class CreateBallotsTable extends Migration
{
    public function up(): void
    {
        // Pastikan extension pgcrypto tersedia untuk fungsi gen_random_uuid() di PostgreSQL jika versi lama
        $this->db->query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        $this->forge->addField([
            'id' => [
                'type'    => 'UUID',
                'default' => new RawSql('gen_random_uuid()'),
            ],
            'candidate_id' => [
                'type' => 'INT',
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('candidate_id', 'candidates', 'id', 'CASCADE', 'RESTRICT');
        $this->forge->createTable('ballots');
    }

    public function down(): void
    {
        $this->forge->dropTable('ballots', true);
    }
}
