App.controller('AppController', function($rootScope, $scope, $state, $window, $localStorage, $timeout, toggleStateService) {

    'use strict';

    // Hook not found
    $rootScope.$on('$stateNotFound',
        function(event, unfoundState, fromState, fromParams) {
            console.log(unfoundState.to); // "lazy.state"
            console.log(unfoundState.toParams); // {a:1, b:2}
            console.log(unfoundState.options); // {inherit:false} + default options
        });
    // Hook error
    $rootScope.$on('$stateChangeError',
        function(event, toState, toParams, fromState, fromParams, error) {
            console.log(error);
        });
    // Hook success
    $rootScope.$on('$stateChangeSuccess',
        function(event, toState, toParams, fromState, fromParams) {
            // display new view from top
            $window.scrollTo(0, 0);
            // Save the route title
            $rootScope.currTitle = $state.current.title;
        });

    $rootScope.currTitle = $state.current.title;
    $rootScope.pageTitle = function() {
        return ($rootScope.currTitle || $rootScope.app.description) + ' - ' + $rootScope.app.name;
    };

    toggleStateService.restoreState($(document.body));

    // Applies animation to main view for the next pages to load
    $timeout(function() {
        $rootScope.mainViewAnimation = $rootScope.app.viewAnimation;
    });

    // cancel click event easily
    $rootScope.cancel = function($event) {
        $event.stopPropagation();
    };
});
