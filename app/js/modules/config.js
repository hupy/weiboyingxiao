App.config(function(
  $stateProvider,
  $urlRouterProvider,
  $controllerProvider,
  $compileProvider,
  $filterProvider,
  $provide
) {
  'use strict'

  App.controller = $controllerProvider.register
  App.directive = $compileProvider.directive
  App.filter = $filterProvider.register
  App.factory = $provide.factory
  App.service = $provide.service
  App.constant = $provide.constant
  App.value = $provide.value

  // default route
  $urlRouterProvider.otherwise('/app/customers')

  $stateProvider
    .state('app', {
      url: '/app',
      abstract: true,
      templateUrl: 'views/app.html',
      controller: 'AppController'
    })
    .state('app.customers', {
      url: '/customers',
      title: '用户的微博列表',
      templateUrl: 'views/customers.html'
    })
    .state('app.logs', {
      url: '/logs',
      title: '日志列表',
      templateUrl: 'views/logs.html'
    })
    .state('app.tasks', {
      url: '/tasks',
      title: '任务列表',
      templateUrl: 'views/tasks.html'
    })
    .state('app.settings', {
      url: '/settings',
      title: '设置',
      templateUrl: 'views/settings.html'
    })
    .state('app.accounts', {
      url: '/accounts',
      title: '我的微博账号列表',
      templateUrl: 'views/accounts.html'
    })
    .state('app.donation', {
      url: '/donation',
      title: '打赏',
      templateUrl: 'views/donation.html'
    })
}).controller('NullController', function() {})
