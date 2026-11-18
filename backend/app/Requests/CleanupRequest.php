<?php

declare(strict_types=1);

namespace App\Requests;

final class CleanupRequest extends BaseRequest
{
    public function rules(): array
    {
        return [
            'confirmation_code' => 'required',
        ];
    }

    public function messages(): array
    {
        return [
            'confirmation_code' => [
                'required' => 'Kode konfirmasi teks wajib diisi.',
            ],
        ];
    }
}
