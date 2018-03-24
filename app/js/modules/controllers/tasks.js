App.controller('TasksController', function($scope, toastr, $state) {
  $scope.allInCurrentPageSelected = false
  $scope.allSelected = false
  $scope.allTasks = []
  $scope.tasks = []
  $scope.count = 0

  $scope.$watch('allInCurrentPageSelected', function(newValue, oldValue) {
    if (newValue == false) {
      $scope.allSelected = false
    }

    for (var i in $scope.tasks) {
      $scope.tasks[i].isSelected = newValue
    }
  })

  $scope.getTypeText = function(type) {
    var result = ''
    switch (type) {
      case 'follow':
        result = '收听'
        break
      case 'forward':
        result = '转发'
        break
      case 'message':
        result = '私信'
        break
      case 'comment':
        result = '评论'
        break
      case 'praise':
        result = '点赞'
        break
    }

    return result
  }

  $scope.selectAll = function() {
    $scope.allSelected = true

    $.Utils.showSpinner()

    chrome.runtime.sendMessage(
      {
        method: 'getTasks',
        start: 0,
        pageSize: $scope.count,
        searchConditions: $scope.searchConditions
      },
      function(response) {
        $scope.allTasks = response.list

        $.Utils.hideSpinner()
      }
    )
  }

  $scope.cancelSelectAll = function() {
    $scope.allSelected = false
  }

  $scope.getStatusCss = function(status) {
    switch (status) {
      case '等待执行':
        return 'label label-warning'
      case '已完成':
        return 'label label-success'
    }

    return 'label label-danger'
  }

  $.Utils.showSpinner()

  $scope.callServer = function callServer(tableState) {
    var pagination = tableState.pagination

    var start = pagination.start || 0
    var number = pagination.number || 50

    chrome.runtime.sendMessage(
      {
        method: 'getTasks',
        start: start,
        pageSize: number,
        searchConditions: $scope.searchConditions
      },
      function(response) {
        $scope.$apply(function() {
          $scope.tasks = response.list

          var count = response.count
          $scope.count = count

          tableState.pagination.numberOfPages = Math.ceil(count / number)

          $.Utils.hideSpinner()
        })
      }
    )
  }

  var getSelectedIds = function() {
    var list = [],
      tasks
    if ($scope.allSelected) {
      tasks = $scope.allTasks
      for (var i in tasks) {
        list.push(tasks[i].id)
      }
    } else {
      tasks = $scope.tasks
      for (var i in tasks) {
        var task = tasks[i]
        task.isSelected && list.push(task.id)
      }
    }

    return list
  }

  $scope.searchConditions = {
    taskStatus: localStorage.taskStatus,
    taskType: localStorage.taskType
  }

  var storeSearchConditions = function() {
    var searchConditions = $scope.searchConditions
    localStorage.taskStatus = searchConditions.taskStatus || ''
    localStorage.taskType = searchConditions.taskType || ''
  }

  $scope.search = function() {
    storeSearchConditions()
    $state.reload()
  }

  $scope.deleteTasks = function() {
    var ids = getSelectedIds()
    if (ids.length === 0) {
      toastr.error('请先选择任务！')
      return
    }

    if (confirm('确定删除所选任务？')) {
      $.Utils.showSpinner()

      chrome.runtime.sendMessage(
        {
          method: 'deleteTasks',
          ids: ids
        },
        function(response) {
          $.Utils.hideSpinner()

          toastr.success('删除任务成功！')

          $state.reload()
        }
      )
    }
  }
})
