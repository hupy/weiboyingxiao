App.controller('SettingsController', function($scope, toastr) {
    $scope.settings = {
        praiseIntervalTime: localStorage.praiseIntervalTime || 30,
        commentIntervalTime: localStorage.commentIntervalTime || 30,
        followIntervalTime: localStorage.followIntervalTime || 30,
        forwardIntervalTime: localStorage.forwardIntervalTime || 30,
        messageIntervalTime: localStorage.messageIntervalTime || 30,
        randomContents: localStorage.randomContents || '嗯，有道理～\n有空再看\n转发微博\n你很啰嗦啊。\n已阅。'
    };

    $scope.update = function(settings) {
        localStorage.praiseIntervalTime = settings.praiseIntervalTime;
        localStorage.commentIntervalTime = settings.commentIntervalTime;
        localStorage.followIntervalTime = settings.followIntervalTime;
        localStorage.forwardIntervalTime = settings.forwardIntervalTime;
        localStorage.messageIntervalTime = settings.messageIntervalTime;
        localStorage.randomContents = settings.randomContents;

        chrome.runtime.sendMessage({
            method: 'restartTasks'
        }, function(response) {
            toastr.success('保存设置成功！');
        });
    };
});
