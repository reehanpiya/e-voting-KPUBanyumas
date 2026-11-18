<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class CreateVotersTable extends Migration
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
            'nisn' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'unique'     => true,
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'class' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'birth_date' => [
                'type' => 'DATE',
            ],
            'has_voted' => [
                'type'    => 'BOOLEAN',
                'default' => false,
            ],
            'voted_at' => [
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
        $this->forge->addKey(['nisn', 'birth_date']);
        $this->forge->addKey('has_voted');
        $this->forge->createTable('voters');
    }

    public function down(): void
    {
        $this->forge->dropTable('voters', true);
    }
}
