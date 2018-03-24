App.controller('CustomersController', function($scope, toastr, $uibModal, $filter, $state) {

    'use strict';

    $scope.allInCurrentPageSelected = false;
    $scope.allSelected = false;
    $scope.allCustomers = [];
    $scope.customers = [];
    $scope.count = 0;

    $scope.$watch('allInCurrentPageSelected', function(newValue, oldValue) {
        if (newValue === false) {
            $scope.allSelected = false;
        }

        for (var i in $scope.customers) {
            $scope.customers[i].isSelected = newValue;
        }
    });

    $scope.selectAll = function() {

        $scope.allSelected = true;

        $.Utils.showSpinner();

        chrome.runtime.sendMessage({
            method: 'getCustomers',
            start: 0,
            pageSize: $scope.count,
            searchConditions: $scope.searchConditions
        }, function(response) {

            $scope.allCustomers = response.list;

            $.Utils.hideSpinner();
        });
    };

    $scope.cancelSelectAll = function() {
        $scope.allSelected = false;
    };

    $scope.searchConditions = {
        keywords: localStorage.keywords,
        filters: localStorage.filters,
        statusesCountMin: localStorage.statusesCountMin,
        statusesCountMax: localStorage.statusesCountMax,
        commentsCountMin: localStorage.commentsCountMin,
        commentsCountMax: localStorage.commentsCountMax,
        repostsCountMin: localStorage.repostsCountMin,
        repostsCountMax: localStorage.repostsCountMax,
        attitudesCountMin: localStorage.attitudesCountMin,
        attitudesCountMax: localStorage.attitudesCountMax,
        followersCountMin: localStorage.followersCountMin,
        followersCountMax: localStorage.followersCountMax,
        friendsCountMin: localStorage.friendsCountMin,
        friendsCountMax: localStorage.friendsCountMax,
        gender: localStorage.gender
    };

    $.Utils.showSpinner();

    $scope.callServer = function callServer(tableState) {

        var pagination = tableState.pagination;

        var start = pagination.start || 0;
        var number = pagination.number || 50;

        chrome.runtime.sendMessage({
            method: 'getCustomers',
            start: start,
            pageSize: number,
            searchConditions: $scope.searchConditions
        }, function(response) {
            $scope.$apply(function() {
                $scope.customers = response.list;

                var count = response.count;
                $scope.count = count;

                tableState.pagination.numberOfPages = Math.ceil(count / number);

                $.Utils.hideSpinner();
            });
        });

    };

    $scope.getGender = function(gender) {
        if (gender === 1) {
            return '男';
        } else if (gender === 2) {
            return '女';
        }

        return '';
    };

    var storeSearchConditions = function() {

        var searchConditions = $scope.searchConditions;
        localStorage.keywords = searchConditions.keywords || '';
        localStorage.filters = searchConditions.filters || '';
        localStorage.statusesCountMin = searchConditions.statusesCountMin || '';
        localStorage.statusesCountMax = searchConditions.statusesCountMax || '';
        localStorage.commentsCountMin = searchConditions.commentsCountMin || '';
        localStorage.commentsCountMax = searchConditions.commentsCountMax || '';
        localStorage.repostsCountMin = searchConditions.repostsCountMin || '';
        localStorage.repostsCountMax = searchConditions.repostsCountMax || '';
        localStorage.attitudesCountMin = searchConditions.attitudesCountMin || '';
        localStorage.attitudesCountMax = searchConditions.attitudesCountMax || '';
        localStorage.followersCountMin = searchConditions.followersCountMin || '';
        localStorage.followersCountMax = searchConditions.followersCountMax || '';
        localStorage.friendsCountMin = searchConditions.friendsCountMin || '';
        localStorage.friendsCountMax = searchConditions.friendsCountMax || '';
        localStorage.gender = searchConditions.gender || '';
    };

    var showModal = function(index, templateUrl, controller) {
        var items;
        if (!isNaN(index)) {
            items = [];
            items.push(getTask($scope.customers[index]));
        } else {
            items = getSelectedItems();
        }

        if (items.length === 0) {
            toastr.error('请先选择用户！');
            return;
        }

        $uibModal.open({
            templateUrl: templateUrl,
            controller: controller,
            resolve: {
                items: function() {
                    return items;
                }
            }
        });
    };

    $scope.comment = function(index) {
        showModal(index, 'comment-modal.html', 'CommentModalController');
    };

    $scope.forward = function(index) {
        showModal(index, 'forward-modal.html', 'ForwardModalController');
    };

    var strip = function(html) {
        var tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    var getTask = function(customer) {
        return {
            statusId: customer.statusId,
            userId: customer.userId,
            content: '',
            statusLink: customer.statusLink,
            statusContent: strip(customer.content).replace(/#/g, '').replace(/(?:\bhttps?:\/\/|\bwww\.|\[url)\S+\s*/g, '').trim()
        };
    };

    var getSelectedItems = function() {
        var list = [],
            customers;

        if ($scope.allSelected) {
            customers = $scope.allCustomers;
            for (var i in customers) {
                list.push(getTask(customers[i]));
            }
        } else {
            customers = $scope.customers;
            for (var i in customers) {
                var customer = customers[i];
                customer.isSelected && list.push(getTask(customer));
            }
        }

        return list;
    };

    var getSelectedIds = function() {
        var list = [],
            customers;
        if ($scope.allSelected) {
            customers = $scope.allCustomers;
            for (var i in customers) {
                list.push(customers[i].id);
            }
        } else {
            customers = $scope.customers;
            for (var i in customers) {
                var customer = customers[i];
                customer.isSelected && list.push(customer.id);
            }
        }

        return list;
    };

    $scope.deleteCustomers = function(id) {

        var ids = [];
        if (id) {
            ids.push(id);
        } else {
            ids = getSelectedIds();
            if (ids.length == 0) {
                toastr.error('请先选择用户微博！');
                return;
            }
        }

        if (confirm('确定删除用户微博？')) {

            $.Utils.showSpinner();

            chrome.runtime.sendMessage({
                method: 'deleteCustomers',
                ids: ids
            }, function(response) {

                $.Utils.hideSpinner();

                toastr.success('删除用户微博成功！');

                $state.reload();

            });
        }
    };

    $scope.resetSearch = function() {

        $scope.searchConditions = {};
        storeSearchConditions();
        $state.reload();
    };

    $scope.search = function() {
        storeSearchConditions();
        $state.reload();
    };

    var praiseAndFollow = function(index, type, message) {
        var selectedItems = [];
        if (!isNaN(index)) {
            selectedItems.push(getTask($scope.customers[index]));
        } else {
            selectedItems = getSelectedItems();
        }

        if (selectedItems.length === 0) {
            toastr.error('请先选择用户！');
            return;
        }

        chrome.runtime.sendMessage({
            method: 'addTasks',
            type: type,
            list: selectedItems
        }, function(response) {
            $scope.$apply(function() {
                toastr.success(message);
            });
        });
    };

    $scope.praise = function(index) {
        praiseAndFollow(index, 'praise', '添加点赞任务成功，任务已经在任务列表中等待执行！');
    };

    $scope.follow = function(index) {
        praiseAndFollow(index, 'follow', '添加收听任务成功，任务已经在任务列表中等待执行！');
    };

    $scope.message = function(index) {
        showModal(index, 'message-modal.html', 'MessageModalController')
    };
});

var modalConfirm = function($scope, $uibModalInstance, type, items, toastr, message) {
    $.Utils.showSpinner();

    chrome.runtime.sendMessage({
        method: 'addTasks',
        type: type,
        list: items,
        content: $scope.useRandomContent ? '' : $scope.content,
        useRandomContent: $scope.useRandomContent
    }, function(response) {
        $scope.$apply(function() {

            $uibModalInstance.close();

            toastr.success(message);

            $.Utils.hideSpinner();

        });
    });
};

App.controller('CommentModalController', function($scope, $uibModalInstance, items, toastr) {

    $scope.useRandomContent = true;
    $scope.content = '';

    $scope.ok = function() {

        if ($scope.content === '' && !$scope.useRandomContent) {
            toastr.error('如果不使用随机评论，那么评论内容必须填写！');
            return;
        }

        modalConfirm($scope, $uibModalInstance, 'comment', items, toastr, '添加评论任务成功，任务已经在任务列表中等待执行！');
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

App.controller('ForwardModalController', function($scope, $uibModalInstance, items, toastr) {

    $scope.useRandomContent = true;
    $scope.content = '';

    $scope.ok = function() {
        modalConfirm($scope, $uibModalInstance, 'forward', items, toastr, '添加转发任务成功，任务已经在任务列表中等待执行！');
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

App.controller('MessageModalController', function($scope, $uibModalInstance, items, toastr) {

    $scope.content = '';

    $scope.ok = function() {

        if ($scope.content === '') {
            toastr.error('私信内容必须填写！');
            return;
        }

        $.Utils.showSpinner();

        chrome.runtime.sendMessage({
            method: 'addTasks',
            type: 'message',
            list: items,
            content: $scope.content
        }, function(response) {
            $scope.$apply(function() {

                $uibModalInstance.close();

                toastr.success('添加私信任务成功，任务已经在任务列表中等待执行！');

                $.Utils.hideSpinner();

            });
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});
