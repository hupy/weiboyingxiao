App.controller('AccountsController', function($scope, toastr, $uibModal) {
  'use strict'

  $scope.accounts = []

  $.Utils.showSpinner()

  chrome.runtime.sendMessage(
    {
      method: 'getAccounts'
    },
    function(response) {
      $scope.$apply(function() {
        $.Utils.hideSpinner()

        $scope.accounts = response.accounts
      })
    }
  )

  $scope.checkName = function(name, id) {
    if (!name) {
      return '用户名不能为空！'
    }

    for (var i in $scope.accounts) {
      var account = $scope.accounts[i]
      if (account.id !== id && account.username === name) {
        return '用户名已经存在！'
      }
    }
  }

  $scope.taskPaused = function(type, isPaused, id) {
    chrome.runtime.sendMessage(
      {
        method: 'accountTaskPaused',
        id: id,
        type: type,
        isPaused: isPaused
      },
      function(response) {}
    )
  }

  $scope.taskCount = function(type, count, id) {
    chrome.runtime.sendMessage(
      {
        method: 'accountTaskCount',
        id: id,
        type: type,
        count: count
      },
      function(response) {}
    )
  }

  $scope.checkPassword = function(password) {
    if (!password) {
      return '密码不能为空！'
    }
  }

  $scope.saveAccount = function(index, data, id) {
    angular.extend(data, {
      id: id
    })

    chrome.runtime.sendMessage(
      {
        method: id === 0 ? 'addAccount' : 'updateAccount',
        account: data
      },
      function(response) {
        $scope.$apply(function() {
          toastr.success('保存账号成功！')
          var account = $scope.accounts[index]
          account.id = response.accountId
        })
      }
    )
  }

  $scope.removeAccount = function(index, id) {
    chrome.runtime.sendMessage(
      {
        method: 'deleteAccount',
        id: id
      },
      function(response) {
        $scope.$apply(function() {
          toastr.success('删除账号成功！')

          $scope.accounts.splice(index, 1)
        })
      }
    )
  }

  $scope.addAccount = function() {
    $scope.inserted = {
      id: 0,
      username: '',
      password: '',
      status: ''
    }
    $scope.accounts.push($scope.inserted)
  }

  document.getElementById('import-file').addEventListener('change', function(evt) {
    var file = evt.target.files[0]
    if (file) {
      var reader = new FileReader()
      reader.onload = function(e) {
        $.Utils.showSpinner()

        var contents = e.target.result
        var lines = contents.split('\n')
        var line,
          account,
          array,
          count = 0
        var accounts = []
        for (var i in lines) {
          line = lines[i].trim()
          if (line.length > 0) {
            array = line.split(/\s+/)

            account = {
              id: 0,
              username: array[0],
              password: array[1],
              status: ''
            }

            var accountExists = function(element) {
              return element.username === account.username
            }

            if ($scope.accounts.some(accountExists)) {
              continue
            }

            accounts.push(account)
          }
        }

        chrome.runtime.sendMessage(
          {
            method: 'addAccounts',
            accounts: accounts
          },
          function(response) {
            accounts = response.accounts
            for (var i in accounts) {
              $scope.accounts.push(accounts[i])
            }

            $scope.$apply(function() {
              toastr.success('导入' + accounts.length + '个账号！')
              $.Utils.hideSpinner()
            })
          }
        )
      }

      reader.readAsText(file)
      $(this).val('')
    }
  })

  $scope.changePincode = function(account) {
    account.pincodeImageUrl =
      'http://login.sina.com.cn/cgi/pin.php?r=' + Date.now() + '&s=0&p=' + account.pcid
  }

  const checkQrcode = account => {
    chrome.runtime.sendMessage(
      {
        method: 'loginCheckQrcode',
        account: account
      },
      function(response) {
        if (response.status === '登录成功') {
          toastr.success('登录成功！')
          account.showPincode = false
          account.pincode = ''
          account.qrimage = ''
          account.status = response.status
          account.userId = response.userId
          account.screenName = response.screenName
        } else {
          setTimeout(() => {
            checkQrcode(account)
          }, 1000)
        }
      }
    )
  }

  $scope.loginAccount = function(index, account) {
    toastr.error('抱歉，自动登录功能已经无法使用。')
    return

    $.Utils.showSpinner()

    chrome.runtime.sendMessage(
      {
        method: 'loginAccount',
        account: account
      },
      function(response) {
        $scope.$apply(function() {
          $.Utils.hideSpinner()

          var pcid = response.pcid
          if (pcid) {
            account.showPincode = true
            account.pcid = pcid

            $scope.changePincode(account)

            return
          } else if (response.qrimage) {
            toastr.info('您已开启登录保护，请扫码登录!')
            account.qrimage = response.qrimage
            account.qrid = response.qrid
            checkQrcode(account)
            return
          }

          account.showPincode = false
          account.pincode = ''
          account.qrimage = ''

          if (response.status === '登录失败') {
            toastr.error('登录失败，请检查账号是否正确！')
          } else {
            toastr.success('登录成功！')
          }

          $scope.accounts[index].status = response.status
          $scope.accounts[index].userId = response.userId
          $scope.accounts[index].screenName = response.screenName
        })
      }
    )
  }

  $scope.showTaskLog = function(account) {
    $uibModal.open({
      templateUrl: 'task-logs-modal.html',
      controller: 'TaskLogsController',
      resolve: {
        account: function() {
          return account
        }
      }
    })
  }
})

App.controller('TaskLogsController', function($scope, $uibModalInstance, account) {
  $scope.taskLogs = []
  $scope.account = account

  $.Utils.showSpinner()

  chrome.runtime.sendMessage(
    {
      method: 'getTaskLogs',
      userId: account.userId
    },
    function(response) {
      $scope.$apply(function() {
        $.Utils.hideSpinner()

        $scope.taskLogs = response.taskLogs
      })
    }
  )

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel')
  }
})
