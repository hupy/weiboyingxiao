var logService = logService || {};

(function() {
    
    'use strict';

    this.getAll = function(start, pageSize) {

        var count = db.logs.toCollection().count();
        var logs = db.logs.orderBy('id').desc()
            .offset(start)
            .limit(pageSize)
            .toArray();

        return Promise.all([logs, count])
            .then(function(values) {
                return Promise.resolve({
                    list: values[0],
                    count: values[1]
                });
            });

    };

    this.removeAll = function() {
        return db.logs.clear();
    };

    this.add = function(content) {
        db.logs.add({
            content: content,
            createdAt: new Date().toISOString()
        });
    };

    this.getCount = function() {
        return db.logs.toCollection().count();
    };

}).call(logService);
