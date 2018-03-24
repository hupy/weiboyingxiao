var taskService = taskService || {};

(function() {
    this.restartAll = function() {

        chrome.alarms.clearAll();

        this.executeAll();
    };

    this.removeAll = function(ids) {

        var items = db.tasks.toCollection();

        if (ids) {
            items = items.and(function(item) {
                return ids.indexOf(item.id) !== -1;
            });
        }

        return items.delete();
    };

    this.update = function(id, data) {
        return db.tasks.where('id').equals(id).modify(data);
    };

    this.getAll = function(type, status, start, pageSize) {

        var tasks = db.tasks.toCollection()
            .and(function(task) {

                var result = true;

                if (type && task.type !== type) {
                    result = false;
                }

                if (status) {
                    if (status === '其他') {
                        if (task.status === '已完成' || task.status === '等待执行') {
                            result = false;
                        }
                    } else {
                        if (task.status !== status) {
                            result = false;
                        }
                    }
                }

                return result;
            });

        var count = tasks.count();
        tasks = tasks.reverse().offset(start)
            .limit(pageSize).toArray();

        return Promise.all([tasks, count])
            .then(function(values) {
                return Promise.resolve({
                    list: values[0],
                    count: values[1]
                });
            });

    };

    var addTask = function(userId, statusId, statusLink, content, useRandomContent, statusContent, type) {
        var count = db.tasks
            .where('userId').equals(userId)
            .and(function(item) {
                return item.type == type;
            }).count().then(function(count) {
                if (count == 0) {
                    var task = {
                        createdAt: new Date().toISOString(),
                        triggerTime: '',
                        type: type,
                        failedTimes: 0,
                        status: '等待执行',
                        userId: userId,
                        content: content,
                        statusId: statusId,
                        statusLink: statusLink,
                        useRandomContent: useRandomContent,
                        statusContent: statusContent
                    };

                    db.tasks.add(task);
                }
            });

    };

    this.addAll = function(type, content, useRandomContent, list) {
        var item = null;
        for (var i in list) {
            item = list[i];
            addTask(item.userId, item.statusId, item.statusLink, content, useRandomContent, item.statusContent, type);
        }
    };

    this.getLogs = function(userId) {
        return db.taskLogs.where('userId').equals(userId).toArray();
    };

    this.getLeftCount = function() {
        return db.tasks.where('status').equals('等待执行')
            .and(function(item) {
                return item.failedTimes < 3;
            }).count();
    };

    var getTaskLog = function(userId, date) {
        return db.taskLogs.where('date').equals(date).and(function(item) {
            return item.userId === userId;
        });
    };
    this.getLog = function(userId, date) {
        return getTaskLog(userId, date).first();
    };

    this.addLog = function(data) {
        return db.taskLogs.add(data);
    };

    this.updateLog = function(userId, date, data) {
        return getTaskLog(userId, date).modify(data);
    };

    this.getUnfinishedTask = function(type) {
        return db.tasks.where('status').equals('等待执行')
            .and(function(item) {
                return item.failedTimes < 3 && item.type === type;
            }).first();
    };
}).call(taskService);


(function() {

    'use strict';

    var getIntervalTime = function(type) {
        return (localStorage.getItem(type + 'IntervalTime') || 30) * 1000;
    };

    var increaseTaskCount = function(taskLog, type, userId, date) {
        var data = {};

        var countField = type + 'Count';
        if (taskLog) {
            data[countField] = taskLog[countField] + 1;
            taskService.updateLog(userId, date, data);
        } else {
            data['date'] = date;
            data[countField] = 1;
            data['userId'] = userId;
            taskService.addLog(data);
        }

        return data[countField];
    };

    var pauseAccountAndNotifyError = function(account, type, message) {
        accountService.pauseTask(account.id, type, true);
        executeUserIds.set(type, null);
        chromeService.showNotificaton(message);
    };

    this.execute = function(type) {
        if (type === 'checkTaskNumbers') {
            taskService.getLeftCount().then(function(count) {
                chromeService.showBadgeText((count || '').toString());
                chromeService.createAlarm('checkTaskNumbers', 1000);
            });

            return;
        }

        taskService.getUnfinishedTask(type).then(function(task) {

            var intervalTime = getIntervalTime(type);
            chromeService.createAlarm(type, intervalTime);

            if (!task) {
                return;
            }

            var currentUserId = executeUserIds.get(type);
            if (!currentUserId) {

                accountService.getAll().then(function(accounts) {
                    if (accounts.length === 0) {
                        chromeService.showNotificaton('执行任务失败，请先添加微博账号！');
                    } else {
                        accountService.getAvailableUserId(accounts, type)
                            .then(function(userId) {
                                executeUserIds.set(type, userId);
                            });
                    }
                });
                return;
            }

            logService.add('执行任务: ' + JSON.stringify(task));

            accountService.getByUserId(currentUserId).then(function(account) {

                if (!account || !account.token || accountService.isTaskPaused(account, type)) {
                    executeUserIds.set(type, null);
                    return;
                }

                sinaService[type](task, currentUserId, account.token)
                    .then(function(result) {

                        logService.add('执行任务' + task.statusId + '成功！');
                        var date = new Date();
                        taskService.update(task.id, {
                            status: '已完成',
                            triggerTime: date.toISOString(),
                            executeUserId: currentUserId
                        });

                        var dateString = date.toLocaleDateString();
                        taskService.getLog(currentUserId, dateString)
                            .then(function(taskLog) {
                                var countField = type + 'Count';
                                var count = increaseTaskCount(taskLog, type, currentUserId, dateString);
                                if ((account[countField] || 29) <= count) {
                                    executeUserIds.set(type, null);
                                }
                            });
                    })
                    .catch(function(reason) {
                        var status = '等待执行';
                        switch (reason) {
                            case '账号冻结':
                                pauseAccountAndNotifyError(account, type, '账号：' + account.username + '已经被新浪微博冻结!');
                                break;
                            case '未登录':
                                executeUserIds.set(type, null);
                                break;
                            case '网络异常':
                                break;
                            case '发布内容过于频繁':
                                pauseAccountAndNotifyError(account, type, '账号：' + account.username + '操作过于频繁!');
                                break;
                            default:
                                status = reason;
                                break;
                        }

                        logService.add('执行任务' + task.statusId + '失败，原因:' + reason);

                        var date = new Date();
                        taskService.update(task.id, {
                            failedTimes: task.failedTimes + 1,
                            status: status,
                            triggerTime: date.toISOString(),
                            executeUserId: currentUserId
                        });
                    });
            });
        });
    };

    this.executeAll = function() {

        this.execute('checkTaskNumbers');
        this.execute('follow');
        this.execute('forward');
        this.execute('comment');
        this.execute('praise');
        this.execute('message');
    };

}).call(taskService);
