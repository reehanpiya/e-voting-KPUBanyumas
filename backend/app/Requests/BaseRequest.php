<?php

declare(strict_types=1);

namespace App\Requests;

use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\Validation\Exceptions\ValidationException;
use Config\Services;

abstract class BaseRequest
{
    protected IncomingRequest $request;

    /**
     * @var array<string, mixed>
     */
    protected array $data = [];

    public function __construct(?IncomingRequest $request = null)
    {
        /** @var IncomingRequest $req */
        $req = $request ?? service('request');
        $this->request = $req;
        $this->extractData();
    }

    /**
     * Validation rules array for CodeIgniter's Validation service.
     *
     * @return array<string, array<string, string>|string>
     */
    abstract public function rules(): array;

    /**
     * Custom validation messages.
     *
     * @return array<string, array<string, string>>
     */
    public function messages(): array
    {
        return [];
    }

    /**
     * Validate the request data.
     * Returns validated data array or throws ValidationException.
     *
     * @return array<string, mixed>
     * @throws ValidationException
     */
    public function validate(): array
    {
        $validator = Services::validation();
        $validator->setRules($this->rules(), $this->messages());

        if (! $validator->run($this->data)) {
            $formattedErrors = [];
            foreach ($validator->getErrors() as $field => $errorMsg) {
                $formattedErrors[$field] = [$errorMsg];
            }

            $exception = new ValidationException('Validasi input gagal.');
            $exception->setErrors($formattedErrors);
            throw $exception;
        }

        return $this->data;
    }

    /**
     * Extract request payload from JSON or Form POST data.
     */
    protected function extractData(): void
    {
        $json = $this->request->getJSON(true);
        if (is_array($json)) {
            $this->data = $json;
            return;
        }

        $post = $this->request->getPost();
        if (is_array($post) && ! empty($post)) {
            $this->data = $post;
            return;
        }

        $rawInput = $this->request->getRawInput();
        if (is_array($rawInput)) {
            $this->data = $rawInput;
            return;
        }

        $this->data = [];
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return $this->data;
    }
}
