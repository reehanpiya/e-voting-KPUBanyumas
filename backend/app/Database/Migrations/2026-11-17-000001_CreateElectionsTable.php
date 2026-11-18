<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class CreateElectionsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'BIGINT',
                'constraint'     => 20,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'default'    => 'READY',
            ],
            'is_registration_open' => [
                'type'    => 'BOOLEAN',
                'default' => false,
            ],
            'school_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'npsn' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => true,
            ],
            'contact_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'contact_phone' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
            ],
            'contact_email' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
            ],
            'start_time' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'end_time' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'dpt_locked_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'candidates_locked_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'report_downloaded_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('status');
        $this->forge->createTable('elections');
    }

    public function down(): void
    {
        $this->forge->dropTable('elections', true);
    }
}
