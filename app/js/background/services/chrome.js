var chromeService = chromeService || {};

(function() {

    this.showNotificaton = function(message) {
        chrome.notifications.create('', {
            type: 'basic',
            iconUrl: 'icon48.png',
            title: '微博营销助手',
            message: message
        }, function() {});
    };

    var modifyHeaders = function(headerArray, name, value) {
        var didSet = false;
        for (var i in headerArray) {
            var header = headerArray[i];
            if (header.name === name) {
                header.value = value;
                didSet = true;
            }
        }

        if (!didSet) {
            headerArray.push({
                name: name,
                value: value
            });
        }
    };

    this.listenOnBeforeSendHeaders = function() {
        chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {

            var requestHeaders = details.requestHeaders;

            var setCookies = function() {
                for (var i in requestHeaders) {
                    var header = requestHeaders[i];
                    if (header.name === 'extension-cookies') {
                        requestHeaders.splice(i, 1);
                        modifyHeaders(requestHeaders, 'Cookie', header.value);
                    }
                }
            };

            setCookies();

            if (details.url.indexOf('http://www.weibo.com/aj') !== -1) {
                modifyHeaders(details.requestHeaders, 'Referer', 'http://www.weibo.com');
                modifyHeaders(requestHeaders, 'Origin', 'http://www.weibo.com');
            } else if (details.url.indexOf('https://login.sina.com.cn/crossdomain2.php') !== -1) {
                modifyHeaders(details.requestHeaders, 'Referer', 'http://www.weibo.com');
                modifyHeaders(requestHeaders, 'Origin', 'https://login.sina.com.cn');
            } else if (details.url.indexOf('https://passport.weibo.com/wbsso/login') !== -1) {
                modifyHeaders(details.requestHeaders, 'Referer', 'http://www.weibo.com');
                modifyHeaders(requestHeaders, 'Origin', 'https://passport.weibo.com');
            } else if (details.url.indexOf('https://s.weibo.com') !== -1) {
                modifyHeaders(details.requestHeaders, 'Referer', 'https://s.weibo.com');
                modifyHeaders(requestHeaders, 'Origin', 'https://s.weibo.com');
            } else if (details.url.indexOf('https://weibo.com') !== -1) {
                modifyHeaders(details.requestHeaders, 'Referer', 'https://weibo.com');
                modifyHeaders(requestHeaders, 'Origin', 'https://weibo.com');
            }

            return {
                requestHeaders: requestHeaders
            };
        }, {
            urls: ['http://www.weibo.com/aj*&__from=extension',
                'https://login.sina.com.cn/*&__from=extension*',
                'https://s.weibo.com/*&__from=extension*',
                'https://weibo.com/*&__from=extension*',
                'https://passport.weibo.com/wbsso/login*&__from=extension*'
            ]
        }, ['blocking', 'requestHeaders']);
    };

    this.listenOnHeadersReceived = function() {

        chrome.webRequest.onHeadersReceived.addListener(function(details) {

            var responseHeaders = details.responseHeaders;

            if (details.url.indexOf('https://passport.weibo.com/wbsso/login') !== -1) {

                // 登录最后一步获取登录Token
                var token = '';
                for (var i in responseHeaders) {
                    var header = responseHeaders[i];
                    if (header.name === 'Set-Cookie') {
                        var value = header.value;
                        if (value.indexOf('SUB=') !== -1) {
                            token = value.substr(0, value.indexOf(';'));
                        }
                    }
                }

                modifyHeaders(responseHeaders, 'token', token);
            } else if (details.url.indexOf('https://login.sina.com.cn/sso/login.php') !== -1) {

                var cookies = '';
                for (var i in responseHeaders) {
                    var header = responseHeaders[i];
                    if (header.name === 'Set-Cookie') {

                        var value = header.value;
                        cookies += value.substr(0, value.indexOf(';') + 1);
                    }
                }

                modifyHeaders(responseHeaders, 'extension-cookies', cookies);

            } else if (details.url.indexOf('http://www.weibo.com/aj') !== -1) {
                for (var i in responseHeaders) {
                    var header = responseHeaders[i];
                    if (header.name === 'Location') {
                        responseHeaders.splice(i, 1);
                        modifyHeaders(responseHeaders, 'redirect-location', header.value);
                        break;
                    }
                }
                modifyHeaders(responseHeaders, 'Content-Type', 'application/json; charset=utf-8');
            }

            modifyHeaders(responseHeaders, 'Set-Cookie', '');

            return {
                responseHeaders: responseHeaders
            };
        }, {
            urls: ['http://www.weibo.com/aj*&__from=extension',
                'https://login.sina.com.cn/sso/login.php*&__from=extension*',
                'https://passport.weibo.com/wbsso/login*&__from=extension*'
            ]
        }, ['blocking', 'responseHeaders']);
    };

    this.listenOnAlarm = function() {
        chrome.alarms.onAlarm.addListener(function(alarm) {
            taskService.execute(alarm.name);
        });
    };

    this.createAlarm = function(name, milliseconds) {
        chrome.alarms.create(name, {
            when: Date.now() + milliseconds
        });
    };

    this.showBadgeText = function(badgeText) {
        chrome.browserAction.setBadgeBackgroundColor({
            color: [255, 0, 0, 255]
        });

        chrome.browserAction.setBadgeText({
            text: badgeText
        });
    };

    this.listenOnMessage = function() {
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                switch (request.method) {
                    case 'addCustomer':
                        customerService.add(request.customer);
                        sendResponse({
                            isSuccess: true
                        });
                        break;
                    case 'showNotificaton':
                        customerService.showNotificaton(request.message);
                        sendResponse({
                            isSuccess: true
                        });
                        break;
                    case 'getCustomers':
                        customerService.getAll(request.searchConditions, request.start, request.pageSize)
                            .then(function(data) {
                                data.list.forEach(it => {
                                    it.createdAt = new Date(it.createdAt).toLocaleString()
                                })
                                sendResponse(data);
                            });
                        break;
                    case 'deleteCustomers':
                        customerService.removeAll(request.ids).then(function() {
                            sendResponse({
                                isSuccess: true
                            });
                        });
                        break;
                    case 'addTasks':
                        taskService.addAll(request.type, request.content, request.useRandomContent, request.list);
                        sendResponse({
                            isSuccess: true
                        });
                        break;
                    case 'getTasks':
                        var searchConditions = request.searchConditions;
                        taskService.getAll(searchConditions.taskType,
                                searchConditions.taskStatus,
                                request.start, request.pageSize)
                            .then(function(data) {
                                data.list.forEach(it => {
                                    it.createdAt = new Date(it.createdAt).toLocaleString()
                                })
                                sendResponse(data);
                            });
                        break;
                    case 'deleteTasks':
                        taskService.removeAll(request.ids).then(function() {
                            sendResponse({
                                isSuccess: true
                            });
                        });
                        break;
                    case 'restartTasks':
                        taskService.restartAll();
                        sendResponse({
                            isSuccess: true
                        });
                        break;
                    case 'getLogs':
                        logService.getAll(request.start, request.pageSize)
                            .then(function(data) {
                                sendResponse(data);
                            });
                        break;
                    case 'deleteLogs':
                        logService.removeAll().then(function() {
                            sendResponse({
                                isSuccess: true
                            });
                        });
                        break;
                    case 'getAccounts':
                        accountService.getAll().then(function(accounts) {
                            sendResponse({
                                accounts: accounts
                            });
                        });
                        break;
                    case 'getTaskLogs':
                        taskService.getLogs(request.userId).then(function(taskLogs) {
                            sendResponse({
                                taskLogs: taskLogs
                            });
                        });
                        break;
                    case 'deleteAccount':
                        accountService.remove(request.id).then(function() {
                            sendResponse({
                                isSuccess: true
                            });
                        });
                        break;
                    case 'addAccount':
                        var account = request.account;
                        accountService.add(account.username, account.password)
                            .then(function(accountId) {
                                sendResponse({
                                    accountId: accountId,
                                    isSuccess: true
                                });
                            });
                        break;
                    case 'addAccounts':
                        accountService.addAll(request.accounts).then(function(accounts) {
                            sendResponse({
                                accounts: accounts
                            });
                        });
                        break;
                    case 'updateAccount':
                        var account = request.account;
                        accountService.update(account.id, {
                                username: account.username,
                                password: account.password
                            })
                            .then(function() {
                                sendResponse({
                                    accountId: account.id,
                                    isSuccess: true
                                });
                            });
                        break;
                    case 'accountTaskPaused':
                        accountService.pauseTask(request.id, request.type, request.isPaused)
                            .then(function() {
                                sendResponse({
                                    isSuccess: true
                                });
                            });
                        break;
                    case 'accountTaskCount':
                        accountService.updateTaskCount(request.id, request.type, request.count)
                            .then(function() {
                                sendResponse({
                                    isSuccess: true
                                });
                            });
                        break;
                    case 'loginAccount':
                        accountService.login(request.account)
                            .then(sendResponse, sendResponse);
                        break;
                    case 'loginCheckQrcode':
                        accountService.checkQrcode(request.account)
                            .then(sendResponse, sendResponse);
                        break;
                }

                return true;
            });
    };

}).call(chromeService);
