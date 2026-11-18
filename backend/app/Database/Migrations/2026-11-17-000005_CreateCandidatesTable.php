<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class CreateCandidatesTable extends Migration
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
            'number' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unique'     => true,
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'photo_url' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'vision' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'mission' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'program' => [
                'type' => 'TEXT',
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
        $this->forge->addKey('number');
        $this->forge->createTable('candidates');
    }

    public function down(): void
    {
        $this->forge->dropTable('candidates', true);
    }
}
