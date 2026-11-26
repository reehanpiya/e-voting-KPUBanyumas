<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// --------------------------------------------------------------------
// Public Health Check
// --------------------------------------------------------------------
$routes->get('api/health', 'Api\HealthController::index');

// --------------------------------------------------------------------
// Public School Registration
// --------------------------------------------------------------------
$routes->group('api/public', static function (RouteCollection $routes): void {
    $routes->get('registration-config', 'Api\Public\RegistrationController::config');
    $routes->post('registrations', 'Api\Public\RegistrationController::submit');
    $routes->get('registrations/(:segment)', 'Api\Public\RegistrationController::check/$1');
    $routes->get('status', 'Api\School\StatusController::current');
    $routes->get('schedule', 'Api\School\ScheduleController::show');
    $routes->get('candidates', 'Api\School\CandidateController::index');
    $routes->get('turnout', 'Api\Public\ResultsController::turnout');
    $routes->get('results', 'Api\Public\ResultsController::results');
    $routes->post('check-dpt', 'Api\Public\DptController::check');
});

$routes->post('api/voter/verify', 'Api\Voter\VoterVerificationController::verify');
$routes->post('api/booth/validate-token', 'Api\Booth\BoothController::validateToken');
$routes->post('api/booth/vote', 'Api\Booth\BoothController::vote');

// --------------------------------------------------------------------
// Authentication Routes (TASK-BE-02)
// --------------------------------------------------------------------
$routes->group('api/admin', static function (RouteCollection $routes): void {
    $routes->post('login', 'Api\AuthController::login');
    $routes->post('logout', 'Api\AuthController::logout', ['filter' => 'auth']);
    $routes->get('me', 'Api\AuthController::me', ['filter' => 'auth']);
});

// --------------------------------------------------------------------
// School Admin Routes
// --------------------------------------------------------------------
$routes->group('api/school', ['filter' => ['auth', 'role:admin_sekolah']], static function (RouteCollection $routes): void {
    $routes->get('status', 'Api\School\StatusController::current');
    $routes->post('status', 'Api\School\StatusController::updateStatus', ['filter' => 'primary']);
    $routes->post('status/publish', 'Api\School\StatusController::publish', ['filter' => 'primary']);

    $routes->get('voters', 'Api\School\VoterController::index');
    $routes->post('voters/import', 'Api\School\VoterController::import', ['filter' => 'primary']);
    $routes->post('voters/lock', 'Api\School\VoterController::lock', ['filter' => 'primary']);

    $routes->get('candidates', 'Api\School\CandidateController::index');
    $routes->get('candidates/manage', 'Api\School\CandidateController::manage');
    $routes->get('candidates/(:num)', 'Api\School\CandidateController::show/$1');
    $routes->post('candidates', 'Api\School\CandidateController::create');
    $routes->match(['put', 'post'], 'candidates/(:num)', 'Api\School\CandidateController::update/$1');
    $routes->delete('candidates/(:num)', 'Api\School\CandidateController::delete/$1');
    $routes->post('candidates/lock', 'Api\School\CandidateController::lock', ['filter' => 'primary']);

    $routes->get('schedule', 'Api\School\ScheduleController::show');
    $routes->put('schedule', 'Api\School\ScheduleController::update', ['filter' => 'primary']);

    $routes->get('results', 'Api\School\ReportController::results');
    $routes->get('reports/export-csv', 'Api\School\ReportController::exportCsv');
    $routes->get('reports/export-pdf', 'Api\School\ReportController::exportPdf');
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
