App.controller('NavigationController', function($rootScope, $scope, $state) {
  $scope.menuItems = [
    {
      text: '用户的微博列表',
      sref: 'app.customers'
    },
    {
      text: '任务列表',
      sref: 'app.tasks'
    },
    {
      text: '我的微博账号列表',
      sref: 'app.accounts'
    },
    {
      text: '技术支持',
      sref: 'app.donation'
    }
  ]

  var isActive = function(item) {
    return $state.is(item.sref) || $state.includes(item.sref)
  }

  $scope.getMenuItemPropClasses = function(item) {
    return isActive(item) ? ' active' : ''
  }
})
