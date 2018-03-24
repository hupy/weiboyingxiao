var db = new Dexie('weiboyingxiao');
db.version(1).stores({
    logs: '++id,content,createdAt',
    tasks: '++id,content,userId,statusId,createdAt,triggerTime,failedTimes,status,type,useRandomContent,statusContent',
    customers: '++id,userId,statusId,url,profileImageUrl,screenName,content,friendsCount,followersCount,statusesCount,description,location,school,company,keywords,source,createdAt,statusLink,attitudesCount,commentsCount,repostsCount,gender,domain,isMember,verified',
    accounts: '++id,username,password,userId,status',
    taskLogs: '++id,userId,date'
});
db.open();

var executeUserIds = {
    get: function(type) {
        return localStorage.getItem(type + ':UserId');
    },
    set: function(type, value) {
        var key = type + ':UserId';
        if (value == null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    }
};

(function() {

    'use strict';

    chromeService.listenOnBeforeSendHeaders();
    chromeService.listenOnHeadersReceived();
    chromeService.listenOnMessage();
    chromeService.listenOnAlarm();
    taskService.executeAll();

    logService.getCount().then(function(count) {
        if (count > 20000) {
            logService.removeAll();
        }
    });

})();
