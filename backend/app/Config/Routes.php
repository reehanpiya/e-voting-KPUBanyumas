<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// --------------------------------------------------------------------
// Public Health Check
// --------------------------------------------------------------------
$routes->get('api/health', 'Api\HealthController::index');

// --------------------------------------------------------------------
// Authentication Routes (TASK-BE-02)
// --------------------------------------------------------------------
$routes->group('api/admin', static function (RouteCollection $routes): void {
    $routes->post('login', 'Api\AuthController::login');
    $routes->post('logout', 'Api\AuthController::logout', ['filter' => 'auth']);
    $routes->get('me', 'Api\AuthController::me', ['filter' => 'auth']);
});

// --------------------------------------------------------------------
// Super Admin KPU Routes (TASK-BE-04)
// Protected by 'auth' and 'role:super_admin'
// --------------------------------------------------------------------
$routes->group('api/super', ['filter' => ['auth', 'role:super_admin']], static function (RouteCollection $routes): void {
    $routes->post('registration-toggle', 'Api\SuperAdminController::toggleRegistration');
    $routes->get('registrations', 'Api\SuperAdminController::registrations');
    $routes->post('registrations/(:segment)/approve', 'Api\SuperAdminController::approveRegistration/$1');
    $routes->get('progress', 'Api\SuperAdminController::progress');
    $routes->post('cleanup', 'Api\SuperAdminController::cleanup');
});
