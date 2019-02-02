const queryString = name => {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
    results = regex.exec(location.href)
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

const getPageNumber = () => {
  const pageValue = queryString('page')
  if (pageValue) {
    return parseInt(pageValue)
  }

  return 1
}

const getAttitudesCount = function($feed) {
  return parseInt($feed.find('> .card-act a[action-type="feed_list_like"] em').text().trim()) || 0
}

const getCommentsCount = function($feed) {
  return parseInt($feed.find('> .card-act a[action-type="feed_list_comment"]').text().replace('评论', '').trim()) || 0
}

const getRepostsCount = function($feed) {
  return parseInt($feed.find('> .card-act a[action-type="feed_list_forward"] em').text().replace('转发', '').trim()) || 0
}

const getProfileUrl = function($feed) {
  return 'https:' + $feed.find('.content > .info .name').attr('href')
}

const getUserId = function($feed) {
  return $feed.find('.content > .info .name').attr('href').match(/([\d]+)/)[0]
}

const getStatusLink = function($from) {
  return 'https:' + $from.find('a').eq(0).attr('href')
}

const getCustomersInNextPage = function() {
  var pageCount = parseInt(sessionStorage.getItem('page_count'))

  var pageNumber = getPageNumber()
  if (pageNumber < pageCount && $('.m-page .next').length > 0) {
    window.location.href = $('.m-page .next').attr('href')
  } else {
    sessionStorage.setItem('page_count', null)
    $('#wbyx-loading').hide()
    chrome.runtime.sendMessage(
      {
        method: 'showNotificaton',
        message: '您需要的前' + pageNumber + '页用户微博数据已经获取完毕！'
      },
      function(response) {}
    )
  }
}

const getProfileCustomer = function($feedList, index) {
  if (window.cancelGetCustomers) {
    return
  }

  var $feed = $feedList.eq(index)
  if ($feed.attr('node-type') == 'lazyload' || $feed.find('div[node-type="lazyload"]').length > 0) {
    window.scrollTo(0, document.body.scrollHeight)

    setTimeout(function() {
      getProfileCustomer(getFeedList(), index)
    }, 1000)

    return
  }

  if ($feed.find('.W_pages').length > 0 || $feed.find('.WB_empty').length > 0) {
    getCustomersInNextPage()
    return
  }

  var userId = $feed.attr('tbinfo').replace('ouid=', '')
  if (userId.indexOf('&') != -1) {
    userId = userId.substring(0, userId.lastIndexOf('&'))
  }

  var url = 'http://www.weibo.com/' + userId
  var profileImageUrl = 'https:' + $('.pf_photo .photo').attr('src')

  var screenName = $feed.find('[node-type="feed_list_content"]').attr('nick-name')
  let content = $feed
    .find('[node-type="feed_list_content"]')
    .html()
    .replace(/(<img\ssrc=")(.*?)("\s?>)/g, '$1https:$2$3')

  var statusId = $feed.attr('mid')
  var createdAt = $feed.find('a[node-type="feed_list_item_date"]').attr('title')
  var source = $feed.find('a[action-type="app_source"]').text()

  var $from = $feed.find('.WB_feed_detail .content .feed_from a')
  if ($from.length == 0) {
    $from = $feed.find('.WB_feed_detail .WB_detail .WB_from a')
  }


  var statusLink = getStatusLink($from)

  var attitudesCount = getAttitudesCount($feed)
  var commentsCount = getCommentsCount($feed)
  var repostsCount = getRepostsCount($feed)

  var verified = false

  var friendsCount = parseInt(
    $('.tb_counter .t_link strong:eq(0)')
      .text()
      .trim()
  )
  var followersCount = parseInt(
    $('.tb_counter .t_link strong:eq(1)')
      .text()
      .trim()
  )
  var statusesCount = parseInt(
    $('.tb_counter .t_link strong:eq(2)')
      .text()
      .trim()
  )

  var gender = 0
  if ($('.icon_pf_male').length > 0) {
    gender = 1
  } else if ($('.icon_pf_female').length > 0) {
    gender = 2
  }

  var description = $('.pf_intro').text()
  var location = $('.ul_detail li:eq(0) .item_text')
    .text()
    .trim()
  var school = ''
  var company = ''

  var customer = {
    userId: userId,
    statusId: statusId,
    url: url,
    profileImageUrl: profileImageUrl,
    screenName: screenName,
    content: content,
    friendsCount: friendsCount,
    followersCount: followersCount,
    statusesCount: statusesCount,
    description: description,
    location: location,
    school: school,
    company: company,
    keywords: '',
    source: source,
    createdAt: createdAt,
    statusLink: statusLink,
    attitudesCount: attitudesCount,
    commentsCount: commentsCount,
    repostsCount: repostsCount,
    gender: gender,
    domain: '',
    isMember: false,
    verified: verified
  }

  var totalNumber = $feedList.length
  chrome.runtime.sendMessage(
    {
      method: 'addCustomer',
      customer: customer,
      totalNumber: totalNumber,
      index: index
    },
    function(response) {
      index++

      $('.wbyx-message .progress').text(index + ' / ' + totalNumber)

      if (index < totalNumber) {
        getProfileCustomer($feedList, index)
      } else {
        getCustomersInNextPage()
      }
    }
  )
}

var getCustomer = function($feedList, keywords, index) {
  if (window.cancelGetCustomers) {
    return
  }

  var $feed = $feedList.eq(index)
  if ($feed.attr('node-type') == 'lazyload' || $feed.find('div[node-type="lazyload"]').length > 0) {
    window.scrollTo(0, document.body.scrollHeight)

    setTimeout(function() {
      getCustomer(getFeedList(), keywords, index)
    }, 1000)

    return
  }

  if ($feed.find('.W_pages').length > 0 || $feed.find('.WB_empty').length > 0) {
    getCustomersInNextPage()
    return
  }

  var url = getProfileUrl($feed)

  var profileImageUrl = 'https:' + $feed.find('> .card-feed > .avator img').attr('src')
  var userId = getUserId($feed)

  var screenName = $feed.find('> .card-feed .content > .info .name').text().trim()
  let $feedContent = $feed.find('> .card-feed .content .txt[node-type="feed_list_content_full"]')
  if ($feedContent.length > 0) {
      $feedContent.find('a[action-type="fl_fold"]').remove()
  } else {
      $feedContent = $feed.find('> .card-feed .content .txt[node-type="feed_list_content"]')
  }

  $feedContent.find('.wbicon').remove()

  let content = $feedContent.html()
    .replace(/(<img\ssrc=")(.*?)("\s?>)/g, '$1https:$2$3')
    .replace(/(<a\shref="\/)(.*?)("\s?>)/g, '<a href="https://s.weibo.com/$2$3')

  var $from = $feed.find('> .card-feed .content .from').last('a')

  var statusId = $feed.parent().attr('mid')

  var createdAt = $from.find('a').eq(0).text().trim()
  var now = new Date()
  var year = now.getFullYear()
  if (createdAt.indexOf('今天') !== -1) {
    var month = now.getMonth() + 1
    if (month < 10) {
      month = '0' + month
    }
    var day = now.getDate()
    if (day < 10) {
      day = '0' + day
    }
    createdAt = new Date(`${year}-${month}-${day}T${createdAt.replace('今天', '')}:00+08:00`).toISOString()
  } else if (createdAt.indexOf('秒前') !== -1) {
    now.setSeconds(now.getSeconds() + parseInt(createdAt.replace('秒前', '')))
    createdAt = now.toISOString()
  } else if (createdAt.indexOf('秒 ') !== -1) {
    now.setSeconds(now.getSeconds() + parseInt(createdAt.split(' ')[0].replace('秒 ', '')))
    createdAt = now.toISOString()
  } else if (createdAt.indexOf('分钟前') !== -1) {
    now.setMinutes(now.getMinutes() + parseInt(createdAt.replace('分钟前', '')))
    createdAt = now.toISOString()
  } else {
    createdAt = createdAt.replace('月', '-').replace('日 ', 'T')
    if (createdAt.indexOf('年') !== -1) {
      createdAt = createdAt.replace('年', '-')
      createdAt = new Date(`${createdAt}:00+08:00`).toISOString()
    } else {
      createdAt = new Date(`${year}-${createdAt}:00+08:00`).toISOString()
    }
  }

  var source = $from.find('a').eq(1).text()

  var statusLink = getStatusLink($from)

  var attitudesCount = getAttitudesCount($feed)
  var commentsCount = getCommentsCount($feed)
  var repostsCount = getRepostsCount($feed)

  var verified = $feed.find('> .content > .info .icon-vip').length > 0

  var getDetailUrl = 'https://weibo.com/aj/user/newcard?id=' + userId
  var xhr = new XMLHttpRequest()
  xhr.open('GET', getDetailUrl, true)
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var result = xhr.responseText
      result = result.replace('try{(', '').replace(')}catch(e){};', '')

      var $html = $($.parseJSON(result).data)
      var $li = $html.find('.name .userdata li').not('.W_vline')
      var friendsCount = parseInt(
        $li
          .eq(0)
          .text()
          .substr(2)
      )
      var followersCountText = $li
        .eq(1)
        .text()
        .substr(2)
      var followersCount =
        followersCountText.lastIndexOf('万') == -1
          ? parseInt(followersCountText)
          : parseInt(followersCountText) * 10000
      var statusesCount = parseInt(
        $li
          .eq(2)
          .text()
          .substr(2)
      )

      var gender = 0
      if ($html.find('.name .female').length > 0) {
        gender = 2
      } else if ($html.find('.name .male').length > 0) {
        gender = 1
      }

      var description = $html.find('.info dd').text()
      $li = $html.find('.user_info .userdata li').not('.W_vline')
      var location = $li.eq(0).find('a').attr('title')
      var school = ''
      var company = ''
      if ($li.length > 1) {
        var liText = $li.eq(1).text()
        if (liText.indexOf('毕业于') != -1) {
          school = $li.eq(1).find('a').attr('title')
        } else {
          company = $li.eq(1).find('a').attr('title')
        }
      }

      if ($li.length > 2) {
        company = $li.eq(2).find('a').attr('title')
      }

      var customer = {
        userId: userId,
        statusId: statusId,
        url: url,
        profileImageUrl: profileImageUrl,
        screenName: screenName,
        content: content,
        friendsCount: friendsCount,
        followersCount: followersCount,
        statusesCount: statusesCount,
        description: description,
        location: location,
        school: school,
        company: company,
        keywords: keywords,
        source: source,
        createdAt: createdAt,
        statusLink: statusLink,
        attitudesCount: attitudesCount,
        commentsCount: commentsCount,
        repostsCount: repostsCount,
        gender: gender,
        domain: '',
        isMember: false,
        verified: verified
      }

      var totalNumber = $feedList.length
      chrome.runtime.sendMessage(
        {
          method: 'addCustomer',
          customer: customer,
          totalNumber: totalNumber,
          index: index
        },
        function(response) {
          index++

          $('.wbyx-message .progress').text(index + ' / ' + totalNumber)

          if (index < totalNumber) {
            getCustomer($feedList, keywords, index)
          } else {
            getCustomersInNextPage()
          }
        }
      )
    }
  }
  xhr.send()
}

const getCustomersFromPage = ($feedList, page_number, page_count, keywords) => {
  new Vue({
    el: '#wbyx-loading',
    data: {
      total: $feedList.length,
      page_number,
      page_count,
      keywords
    },
    methods: {
      cancel: function() {
        sessionStorage.setItem('page_count', null)
        $('#wbyx-loading').hide()
        window.cancelGetCustomers = true
      }
    },
    mounted: function() {
      $('#wbyx-loading').show()
      if ($('.WB_feed_profile').length > 0) {
        getProfileCustomer($feedList, 0)
      } else {
        getCustomer($feedList, keywords, 0)
      }
    }
  })
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.method === 'fetchCustomers') {
    if ($('.gn_login').length > 0) {
      alert('请先登录微博账号再提取数据！')
      return
    }

    window.cancelGetCustomers = false

    sessionStorage.setItem('page_count', request.pageCount)

    var pageNumber = getPageNumber()
    var $feedList = getFeedList()

    var keywords = $('.search-input input:text').val()
    getCustomersFromPage($feedList, pageNumber, request.pageCount, keywords)

    return true
  }
})

const checkPageListBeforeGetCustomers = function(pageNumber, pageCount, keywords) {
  var $feedList = getFeedList()
  if ($feedList.length == 0) {
    setTimeout(() => {
      checkPageListBeforeGetCustomers(pageNumber, pageCount, keywords)
    }, 1000)
  } else {
    getCustomersFromPage($feedList, pageNumber, pageCount, keywords)
  }
}

const getFeedList = function() {
  return $('.m-con-l .card-wrap[mid] .card')
}

$(function() {
  $('body').append(
    $(
      `<div id="wbyx-loading">
      <div class="wbyx-overlayer"></div>
      <div class="wbyx-message">
        <p>正在努力从页面提取用户数据...</p><p class="progress">0 / {{total}}</p>
        <p class="page-number">第{{page_number}}页, 总共提取{{page_count}}页
        <a @click="cancel" class="btn">取消操作</a></p>
      </div>
      <ul class="bokeh">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>`
    ).hide()
  )

  const pageCountValue = sessionStorage.getItem('page_count')
  if (pageCountValue) {
    const pageCount = parseInt(pageCountValue)
    const pageNumber = getPageNumber()
    if (pageNumber >= 1 && pageCount >= pageNumber) {
      const keywords = $('.search-input input:text').val()
      checkPageListBeforeGetCustomers(pageNumber, pageCount, keywords)
    }
  }
})
