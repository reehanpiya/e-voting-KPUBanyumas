<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');
$routes->get('api/health', 'Api\HealthController::index');

/*
 * --------------------------------------------------------------------
 * Track 2: School Admin APIs (DPT, Candidates, Schedule) [TASK-BE-05]
 * --------------------------------------------------------------------
 */
$routes->group('api/school', static function ($routes) {
    // DPT (Voters)
    $routes->get('voters', 'Api\School\VoterController::index');
    $routes->post('voters/import', 'Api\School\VoterController::import');
    $routes->post('voters/lock', 'Api\School\VoterController::lock');

    // Candidates
    $routes->get('candidates', 'Api\School\CandidateController::index');
    $routes->get('candidates/(:num)', 'Api\School\CandidateController::show/$1');
    $routes->post('candidates', 'Api\School\CandidateController::create');
    $routes->match(['put', 'post'], 'candidates/(:num)', 'Api\School\CandidateController::update/$1');
    $routes->delete('candidates/(:num)', 'Api\School\CandidateController::delete/$1');
    $routes->post('candidates/lock', 'Api\School\CandidateController::lock');

    // Schedule
    $routes->get('schedule', 'Api\School\ScheduleController::show');
    $routes->match(['put', 'post'], 'schedule', 'Api\School\ScheduleController::update');

    // Reports & Results (Internal) [TASK-BE-08]
    $routes->get('results', 'Api\School\ReportController::results');
    $routes->get('reports/export-csv', 'Api\School\ReportController::exportCsv');
    $routes->get('report/csv', 'Api\School\ReportController::exportCsv');
    $routes->get('reports/export-pdf', 'Api\School\ReportController::exportPdf');
    $routes->get('report/pdf', 'Api\School\ReportController::exportPdf');
    $routes->get('report', 'Api\School\ReportController::exportPdf');

    // Election Status Transition
    $routes->get('status', 'Api\School\StatusController::current');
    $routes->post('status/publish', 'Api\School\StatusController::publish');
    $routes->post('status', 'Api\School\StatusController::updateStatus');
});

/*
 * --------------------------------------------------------------------
 * Track 2: Voter Verification & Public DPT Check [TASK-BE-06]
 * --------------------------------------------------------------------
 */
$routes->group('api', static function ($routes) {
    // Public DPT Check
    $routes->post('public/check-dpt', 'Api\Public\DptController::check');

    // Voter Mobile Verification & Token Generation
    $routes->post('voter/verify', 'Api\Voter\VoterVerificationController::verify');

    // Public Realcount & Official Results [TASK-BE-08]
    $routes->get('public/realcount', 'Api\Public\ResultsController::turnout');
    $routes->get('public/turnout', 'Api\Public\ResultsController::turnout');
    $routes->get('public/results', 'Api\Public\ResultsController::results');
});

/*
 * --------------------------------------------------------------------
 * Track 2: Voting Booth Engine (Anti Double-Vote) [TASK-BE-07]
 * --------------------------------------------------------------------
 */
$routes->group('api/booth', static function ($routes) {
    $routes->post('validate-token', 'Api\Booth\BoothController::validateToken');
    $routes->post('vote', 'Api\Booth\BoothController::vote');
});



