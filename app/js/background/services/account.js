var accountService = accountService || {}
;(function() {
  var getAccount = function(id) {
    return db.accounts.where('id').equals(id)
  }

  this.remove = function(id) {
    return getAccount(id).delete()
  }

  this.add = function(username, password) {
    return db.accounts.add({
      username: username,
      password: password,
      status: ''
    })
  }

  this.getAll = function() {
    return db.accounts.toArray()
  }

  this.getCount = function() {
    return db.accounts.toCollection().count()
  }

  this.addAll = function(accounts) {
    return new Promise(function(resolve) {
      var addAccounts = function(accounts, i) {
        if (accounts.length === i) {
          resolve(accounts)
          return
        }

        var account = accounts[i]
        accountService.add(account.username, account.password).then(function(accountId) {
          account.id = accountId
          addAccounts(accounts, i + 1)
        })
      }

      addAccounts(accounts, 0)
    })
  }

  this.update = function(id, data) {
    return getAccount(id).modify(data)
  }

  this.pauseTask = function(id, type, isPaused) {
    var data = {}
    data[type + 'Paused'] = isPaused
    return getAccount(id).modify(data)
  }

  this.isTaskPaused = function(account, type) {
    return account[type + 'Paused']
  }

  this.updateTaskCount = function(id, type, count) {
    var data = {}
    data[type + 'Count'] = count
    return getAccount(id).modify(data)
  }

  this.checkQrcode = function(account) {
    return new Promise(function(resolve, reject) {
      sinaService
        .checkQrcode(account.qrid)
        .then(function(result) {
          var userinfo = result.userinfo
          if (userinfo) {
            var data = {
              status: '登录成功',
              token: result.token,
              userId: userinfo.uniqueid,
              screenName: userinfo.displayname
            }

            accountService.update(account.id, data).then(function() {
              resolve(data)
            })
          } else {
            resolve({
              message: result.message
            })
          }
        })
        .catch(function(reason) {
          var data = {
            status: '登录失败',
            userId: '',
            screenName: '',
            token: ''
          }

          accountService.update(account.id, data).then(function() {
            reject(data)
          })
        })
    })
  }

  this.login = function(account) {
    return new Promise(function(resolve, reject) {
      sinaService
        .login(account.username, account.password, account.pincode)
        .then(function(result) {
          var userinfo = result.userinfo
          if (userinfo) {
            var data = {
              status: '登录成功',
              token: result.token,
              userId: userinfo.uniqueid,
              screenName: userinfo.displayname
            }

            accountService.update(account.id, data).then(function() {
              resolve(data)
            })
          } else {
            resolve({
              qrimage: result.qrimage,
              qrid: result.qrid,
              pcid: result.pcid
            })
          }
        })
        .catch(function(reason) {
          var data = {
            status: '登录失败',
            userId: '',
            screenName: '',
            token: ''
          }

          accountService.update(account.id, data).then(function() {
            reject(data)
          })
        })
    })
  }

  this.getByUserId = function(userId) {
    return db.accounts
      .where('userId')
      .equals(userId)
      .first()
  }
}.call(accountService))
;(function() {
  'use strict'

  var getAvailableUserIdInternal = function(type, accounts, i, resolve) {
    if (accounts.length === i) {
      return
    }

    var account = accounts[i]

    if (accountService.isTaskPaused(account, type)) {
      getAvailableUserIdInternal(type, accounts, i + 1, resolve)
      return
    }

    var login = function() {
      sinaService
        .login(account.username, account.password, '')
        .then(function(result) {
          if (result.pcid) {
            chromeService.showNotificaton(
              '尝试登录账号' +
                account.username +
                '失败，该账号登录需要验证码，请在我的微博账号列表页面手动登录！'
            )
            getAvailableUserIdInternal(type, accounts, i + 1, resolve)
          }
          if (result.qrimage) {
            chromeService.showNotificaton(
              '尝试登录账号' +
                account.username +
                '失败，该账号登录需要扫码登录，请在我的微博账号列表页面扫码登录！'
            )
            getAvailableUserIdInternal(type, accounts, i + 1, resolve)
          } else {
            var userinfo = result.userinfo
            var userId = userinfo.uniqueid
            accountService
              .update(account.id, {
                status: '登录成功',
                token: result.token,
                screenName: userinfo.displayname,
                userId: userId
              })
              .then(function() {
                resolve(userId)
              })
          }
        })
        .catch(function(reason) {
          chromeService.showNotificaton('尝试登录账号' + account.username + '失败，请检查该账号！')
          getAvailableUserIdInternal(type, accounts, i + 1, resolve)
        })
    }

    var checkToken = function() {
      if (account.token) {
        sinaService
          .isValidToken(account.token)
          .then(function() {
            resolve(account.userId)
          })
          .catch(function(reason) {
            if (reason === '账号冻结') {
              accountService.pauseTask(account.id, type, true)
              executeUserIds.set(type, null)

              chromeService.showNotificaton('账号：' + account.username + '已经被新浪微博冻结!')

              getAvailableUserIdInternal(type, accounts, i + 1, resolve)
            } else {
              login()
            }
          })
      } else {
        login()
      }
    }

    var dateString = new Date().toLocaleDateString()
    taskService.getLog(account.userId, dateString).then(function(taskLog) {
      if (taskLog) {
        var count = account[type + 'Count'] || 29
        if (taskLog[type + 'Count'] >= count) {
          getAvailableUserIdInternal(type, accounts, i + 1, resolve)
        } else {
          checkToken()
        }
      } else {
        checkToken()
      }
    })
  }

  this.getAvailableUserId = function(accounts, type) {
    return new Promise(function(resolve) {
      getAvailableUserIdInternal(type, accounts, 0, resolve)
    })
  }
}.call(accountService))
