var App = angular.module('weiboMarketing', ['ngAnimate', 'ngStorage', 'ngSanitize',
    'ngCookies', 'ui.bootstrap', 'ui.router', 'ngResource', 'xeditable', 'toastr', 'smart-table'
])
.config([
    '$compileProvider',
    function($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    }
])
.run(['$rootScope', '$state', '$stateParams', '$window', 'editableOptions', function($rootScope, $state, $stateParams, $window, editableOptions) {

    editableOptions.theme = 'bs3';

    // Set reference to access them from any scope
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    $rootScope.$storage = $window.localStorage;

    // Scope Globals
    // ----------------------------------- 
    $rootScope.app = {
        name: '微博营销助手',
        description: '获取新浪微博营销目标用户。多个条件筛选用户，批量推送评论，批量点赞，批量转发，批量收听。',
        viewAnimation: 'ng-fadeInUp'
    };
}]);
