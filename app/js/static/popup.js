new Vue({
  el: '.popup-form',
  data: {
    page_count: 50,
    pages: _.range(1, 501).map(it => ({
      value: it,
      text: `前${it}页`
    })),
    message: '',
    message_css: 'success'
  },
  methods: {
    showMessage: function(message, css) {
      this.message = message
      this.message_css = css
    },
    fetchCustomers: function() {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true
        },
        function(tabs) {
          const tab = tabs[0]
          if (tab.url.indexOf('.weibo.com/') < 0) {
            this.showMessage('请打开<a href="https://s.weibo.com" target="_blank">微博搜索</a>页面并输入关键字搜索内容！', 'error')
            return
          }

          chrome.tabs.sendMessage(
            tab.id,
            {
              method: 'fetchCustomers',
              pageCount: this.page_count
            },
            function(response) {
              this.showMessage('正在提取用户...', 'success')
            }.bind(this)
          )
        }.bind(this)
      )
    }
  }
})

