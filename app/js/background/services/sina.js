let sinaService
;(function() {
  var postData = function(url, data, token) {
    return new Promise(function(resolve, reject) {
      $.ajax({
        url: url + '&__from=extension',
        type: 'POST',
        headers: {
          'extension-cookies': token
        },
        data: data
      })
        .done(function(result, textStatus, jqXHR) {
          if (Object.prototype.toString.call(result) === '[object String]') {
            result = JSON.parse(result)
          }

          if (result.code === '100000') {
            resolve(result)
          } else {
            reject(result.msg)
          }
        })
        .fail(function(jqXHR) {
          var location = jqXHR.getResponseHeader('redirect-location')
          if (location === 'http://weibo.com/unfreeze') {
            reject('账号冻结')
          } else if (location.indexOf('http://weibo.com/login.php') !== -1) {
            reject('未登录')
          } else {
            reject('网络异常')
          }
        })
    })
  }

  var getRandomContent = function() {
    var contents = localStorage.randomContents || '嗯，有道理～\n有空再看\n转发微博\n你很啰嗦啊。\n已阅。'
    var lines = contents.split('\n').filter(function(item) {
      return item.length > 0
    })

    var random = Math.floor(Math.random() * lines.length)
    return lines[random]
  }

  var makeNonce = function(a) {
    var b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      c = ''
    for (var d = 0; d < a; d++) c += b.charAt(Math.ceil(Math.random() * 1e6) % b.length)
    return c
  }

  function getPassword(pwd, servicetime, nonce, rsaPubkey) {
    var rsaKey = new sinaSSOEncoder.RSAKey()
    rsaKey.setPublic(rsaPubkey, '10001')
    return rsaKey.encrypt([servicetime, nonce].join('\t') + '\n' + pwd)
  }

  var findUrls = function(text) {
    var source = (text || '').toString()
    var urlArray = []
    var url
    var matchArray

    var regexToken = /(((ftp|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g

    while ((matchArray = regexToken.exec(source)) !== null) {
      var token = matchArray[0]
      urlArray.push(token)
    }

    return urlArray
  }

  var removeUrlParameter = function(url, parameter) {
    var urlparts = url.split('?')
    if (urlparts.length >= 2) {
      var prefix = encodeURIComponent(parameter) + '='
      var pars = urlparts[1].split(/[&;]/g)

      for (var i = pars.length; i-- > 0; ) {
        if (pars[i].lastIndexOf(prefix, 0) !== -1) {
          pars.splice(i, 1)
        }
      }

      return urlparts[0] + '?' + pars.join('&')
    } else {
      return url
    }
  }

  var sendLoginRequest = function(data, su, username, password, pincode, resolve, reject) {
    var nonce = makeNonce(6)
    var pcid = data.pcid // for pin code.

    // 2. login
    $.ajax({
      url: 'https://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.18)&__from=extension',
      type: 'POST',
      data: {
        entry: 'weibo',
        gateway: 1,
        from: '',
        savestate: 7,
        userticket: 1,
        pagerefer:
          'https://passport.weibo.com/visitor/visitor?entry=miniblog&a=enter&url=http%3A%2F%2Fweibo.com%2F&domain=.weibo.com&ua=php-sso_sdk_client-0.6.9&_rand=' +
          Date.now(),
        vsnf: 1,
        su: su,
        service: 'miniblog',
        servicetime: data.servertime,
        nonce: nonce,
        pwencode: 'rsa2',
        pcid: pcid,
        door: pincode,
        rsakv: data.rsakv,
        sp: getPassword(password, data.servertime, nonce, data.pubkey),
        sr: '1920*1080',
        encoding: 'UTF-8',
        prelt: '873',
        url:
          'https://www.weibo.com/ajaxlogin.php?framelogin=1&callback=parent.sinaSSOController.feedBackUrlCallBack',
        returntype: 'META'
      }
    })
      .done(function(result, textStatus, jqXHR) {
        var url = findUrls($(result).text())[0].replace('http:', 'https:') + '&__from=extension'
        if (url.indexOf('retcode=4049') !== -1 || url.indexOf('retcode=2070') !== -1) {
          localStorage.setItem(username + ':preLoginData', JSON.stringify(data))
          resolve({
            pcid: pcid
          })
          return
        }

        var loginCookies = jqXHR.getResponseHeader('extension-cookies')

        // 3. cross login
        $.ajax({
          url: url,
          type: 'GET',
          headers: {
            'extension-cookies': loginCookies
          }
        })
          .done(function(result) {
            // 4. save login state
            url = findUrls($(result).text())[1]
            if (!url) {
              if (
                $(result)
                  .text()
                  .indexOf('errno":"2071') !== -1
              ) {
                // 您已开启登录保护，请扫码登录!
                $.getJSON(
                  'https://login.sina.com.cn/sso/qrcode/image?entry=sso&size=180&callback=?',
                  function(r) {
                    resolve({
                      qrimage: r.data.image,
                      qrid: r.data.qrid
                    })
                  }
                ).fail(function() {
                  reject('登录失败')
                })
              } else {
                reject('用户名或密码错误！')
              }
              return
            }

            url = removeUrlParameter(url, 'url') + '&callback=?&__from=extension'

            var xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.setRequestHeader('extension-cookies', loginCookies)
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4) {
                resolve({
                  token: xhr.getResponseHeader('token'),
                  userinfo: JSON.parse(xhr.responseText.replace('(', '').replace(');', '')).userinfo
                })
              }
            }
            xhr.send()
          })
          .fail(function() {
            reject('登录失败')
          })
      })
      .fail(function() {
        reject('登录失败')
      })
  }
  class SinaService {
    praise(task, userId, token) {
      return postData(
        'https://weibo.com/aj/v6/like/add?ajwvr=6&__rnd=' + Date.now(),
        {
          location: '',
          mid: task.statusId
        },
        token
      )
    }

    follow(task, userId, token) {
      return postData(
        'https://weibo.com/aj/f/followed?ajwvr=6&__rnd=' + Date.now(),
        {
          uid: task.userId,
          oid: task.userId,
          f: 0,
          refer_sort: 'friends',
          wforce: 1,
          nogroup: 1,
          template: 2
        },
        token
      )
    }

    unfollow(task, userId, token) {
      return postData(
        'https://weibo.com/aj/f/unfollow?ajwvr=6',
        {
          uid: task.userId,
          oid: task.userId
        },
        token
      )
    }

    forward(task, userId, token) {
      var content = task.useRandomContent ? getRandomContent() : task.content
      return postData(
        'https://weibo.com/aj/v6/mblog/forward?ajwvr=6&__rnd=' + Date.now(),
        {
          mid: task.statusId,
          is_comment_base: 1,
          style_type: 2,
          rank: 0,
          _t: 0,
          reason: content.substr(0, 160)
        },
        token
      )
    }

    message(task, userId, token) {
      return postData(
        'https://weibo.com/aj/message/add?ajwvr=6&__rnd=' + Date.now(),
        {
          location: 'msgdialog',
          module: 'msgissue',
          style_id: 1,
          _t: 0,
          uid: task.userId,
          text: task.content
        },
        token
      )
    }

    comment(task, userId, token) {
      var content = task.useRandomContent ? getRandomContent() : task.content
      return postData(
        'https://weibo.com/aj/v6/comment/add?ajwvr=6&__rnd=' + Date.now(),
        {
          act: 'post',
          forward: 0,
          isroot: 0,
          module: 'bcommlist',
          mid: task.statusId,
          uid: userId,
          content: content.substr(0, 160)
        },
        token
      )
    }

    login(username, password, pincode) {
      return new Promise(function(resolve, reject) {
        var su = sinaSSOEncoder.base64.encode(encodeURIComponent(username))
        var url =
          'https://login.sina.com.cn/sso/prelogin.php?entry=weibo&su=' +
          su +
          '&rsakt=mod&client=ssologin.js(v1.4.18)&_=' +
          Date.now() +
          '&callback=?&__from=extension'

        if (pincode) {
          var data = JSON.parse(localStorage.getItem(username + ':preLoginData'))
          sendLoginRequest(data, su, username, password, pincode, resolve, reject)

          return
        }

        // 1. prelogin
        $.getJSON(url, function(result) {
          if (result.retcode !== 0) {
            resolve(result)
            return
          }

          sendLoginRequest(result, su, username, password, '', resolve, reject)
        }).fail(function() {
          reject('登录失败')
        })
      })
    }

    isValidToken(token) {
      return new Promise(function(resolve, reject) {
        $.ajax({
          url:
            'http://www.weibo.com/aj/guide/bubblead?ajwvr=6&_t=0&__rnd=' + Date.now() + '&__from=extension',
          type: 'GET',
          headers: {
            'extension-cookies': token
          }
        })
          .done(function(result) {
            if (result.code === '100000') {
              resolve()
            } else {
              reject(result.msg)
            }
          })
          .fail(function(jqXHR) {
            var location = jqXHR.getResponseHeader('redirect-location')
            if (location === 'http://weibo.com/unfreeze') {
              reject('账号冻结')
            } else {
              reject('账号未登录')
            }
          })
      })
    }

    checkQrcode(qrid) {
      return new Promise(function(resolve, reject) {
        $.getJSON(
          `https://login.sina.com.cn/sso/qrcode/check?entry=weibo&qrid=${qrid}&callback=?&__from=extension`,
          function(r) {
            if (r.data) {
              $.getJSON(
                `https://login.sina.com.cn/sso/login.php?entry=weibo&returntype=TEXT&crossdomain=1&cdult=3&domain=weibo.com&alt=${
                  r.data.alt
                }&savestate=30&callback=?&__from=extension`,
                function(r2, textStatus, jqXHR) {
                  if (r2.crossDomainUrlList) {
                    var xhr = new XMLHttpRequest()
                    xhr.open(
                      'GET',
                      r2.crossDomainUrlList[r2.crossDomainUrlList.length - 1] + '&__from=extension',
                      true
                    )
                    xhr.onreadystatechange = function() {
                      if (xhr.readyState === 4) {
                        resolve({
                          token: xhr.getResponseHeader('token'),
                          userinfo: JSON.parse(xhr.responseText.replace('(', '').replace(');', '')).userinfo
                        })
                      }
                    }
                    xhr.send()
                  } else {
                    reject('登录失败')
                  }
                }
              ).fail(function() {
                reject('登录失败')
              })
            } else {
              resolve({
                message: r.msg // 未使用
              })
            }
          }
        ).fail(function() {
          reject('登录失败')
        })
      })
    }
  }

  sinaService = new SinaService()
})(sinaService)
