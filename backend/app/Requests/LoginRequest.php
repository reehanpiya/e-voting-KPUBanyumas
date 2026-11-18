<?php

declare(strict_types=1);

namespace App\Requests;

final class LoginRequest extends BaseRequest
{
    public function rules(): array
    {
        return [
            'username' => 'required|min_length[3]|max_length[100]',
            'password' => 'required|min_length[6]',
        ];
    }

    public function messages(): array
    {
        return [
            'username' => [
                'required'   => 'Username atau email wajib diisi.',
                'min_length' => 'Username minimal terdiri dari 3 karakter.',
            ],
            'password' => [
                'required'   => 'Password wajib diisi.',
                'min_length' => 'Password minimal terdiri dari 6 karakter.',
            ],
        ];
    }
}
