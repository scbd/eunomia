define(['app', 'lodash', 'services/extended-route',  'services/authentication'], function(app, _) { 'use strict';

    app.config(['extendedRouteProvider', '$locationProvider', function($routeProvider, $locationProvider) {

        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('!');

        $routeProvider.
            when('/',                      { redirectTo: '/schedule/conference' }).
            when('/schedule/conference',   { templateUrl: 'views/schedule/conference.html',  resolveController: true,  resolve : { securized : securize(['Administrator','EunoAdministrator']) }, menu:'schedule'}).
            when('/schedule/side-events',  { templateUrl: 'views/schedule/side-events.html', resolveController: true,  resolve : { securized : securize(['Administrator','EunoAdministrator']) }, menu:'side-events'}).

            when('/events/:eventId/cctv/frames/:id', { templateUrl: 'views/cctv/frame-id.html', controllerAs:"frameIdCtrl", resolveController: true, resolve : { user : securize(['Administrator','EunoAdministrator']) }, menu:'cctv-frames'}).
            when('/events/:eventId/cctv/frames',     { templateUrl: 'views/cctv/frames.html',   controllerAs:"framesCtrl",  resolveController: true, resolve : { user : securize(['Administrator','EunoAdministrator']) }, reloadOnSearch: false, menu:'cctv-frames'}).

            when('/admin/reservation/types',         { templateUrl: 'views/admin/reservation-types.html', resolveController: true, resolve : { securized : securize(['Administrator','EunoAdministrator']) }, menu:'admin'}).
            when('/events/:eventId/cctv/feeds',      { templateUrl: 'views/cctv/feeds.html' ,   controllerAs:"feedsCtrl",   resolveController: true, resolve : { user : securize(['Administrator','EunoAdministrator']) }, menu:'admin' }).
            when('/events/:eventId/cctv/feeds/:id',  { templateUrl: 'views/cctv/feed-id.html' , controllerAs:"feedIdCtrl",  resolveController: true, resolve : { user : securize(['Administrator','EunoAdministrator']) }, menu:'admin' }).

            when('/404', { templateUrl: 'views/404.html' }).
            when('/403', { templateUrl: 'views/403.html' }).
            otherwise({ redirectTo: '/404' });
        }]);

    //============================================================
    //
    //
    //============================================================
    function securize(roles) {

        return ['$location', '$window', '$q','authentication', function ($location, $window, $q, authentication) {

            return authentication.getUser().then(function (user) {

                if (!user.isAuthenticated) {

                    var accountsUrl ='https://accounts.cbd.int';
                    var returnUrl   = $window.encodeURIComponent($window.location.href);

                    $window.location.href = accountsUrl+'/signin?returnUrl=' + returnUrl; // force sign in

                    return $q(function () {});
                }
                else if (roles && !_.isEmpty(roles) && _.isEmpty(_.intersection(roles, user.roles))) {
                    $location.url('/403'); // not authorized
                }

                return user;
            });
        }];
    }
});
