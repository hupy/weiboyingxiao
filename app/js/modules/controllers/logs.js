App.controller('LogsController', function($scope, toastr, $state) {

    'use strict';

    $scope.logs = [];

    $.Utils.showSpinner();

    $scope.count = 0;

    $scope.callServer = function callServer(tableState) {

        var pagination = tableState.pagination;

        var start = pagination.start || 0;
        var number = pagination.number || 50;

        chrome.runtime.sendMessage({
            method: 'getLogs',
            start: start,
            pageSize: number
        }, function(response) {
            $scope.$apply(function() {

                $scope.logs = response.list;

                var count = response.count;
                $scope.count = count;

                tableState.pagination.numberOfPages = Math.ceil(count / number);

                $.Utils.hideSpinner();
            });
        });
    };

    $scope.deleteLogs = function() {

        $.Utils.showSpinner();

        chrome.runtime.sendMessage({
            method: 'deleteLogs'
        }, function(response) {

            $.Utils.hideSpinner();

            toastr.success('清空完成！');

            $state.reload();

        });
    };
});
