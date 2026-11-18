<?php

declare(strict_types=1);

namespace App\Requests;

final class RegistrationToggleRequest extends BaseRequest
{
    public function rules(): array
    {
        return [
            'is_open' => 'required',
        ];
    }

    public function messages(): array
    {
        return [
            'is_open' => [
                'required' => 'Status pembukaan pendaftaran (is_open) wajib diisi.',
            ],
        ];
    }
}
