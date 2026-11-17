<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateElectionsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
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
                'constraint' => 100,
                'null'       => true,
            ],
            'contact_phone' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'null'       => true,
            ],
            'contact_email' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
            ],
            'start_time' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'end_time' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'dpt_locked_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'candidates_locked_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'report_downloaded_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('elections');
    }

    public function down(): void
    {
        $this->forge->dropTable('elections', true);
    }
}
