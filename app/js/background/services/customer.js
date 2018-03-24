var customerService = customerService || {}

;(function() {
  this.add = function(customer) {
    db.customers
      .where('statusId')
      .equals(customer.statusId)
      .count(function(count) {
        if (count === 0) {
          db.customers.add(customer)
        }
      })
  }

  var containsKeywords = function(customer, keywords) {
    var allContent = (
      customer.screenName +
      customer.keywords +
      customer.content +
      customer.description +
      customer.source +
      customer.school +
      customer.company +
      customer.location
    ).toLowerCase()

    var splitted = keywords.toLowerCase().split(' ')
    for (var i in splitted) {
      if (allContent.indexOf(splitted[i]) === -1) {
        return false
      }
    }

    return true
  }

  var containsFilters = function(input, keywords) {
    var splitted = keywords.toLowerCase().split(' ')
    input = input.toLowerCase()
    for (var i in splitted) {
      if (input.indexOf(splitted[i]) !== -1) {
        return true
      }
    }

    return false
  }

  var getCustomerFilter = function(searchConditions) {
    var filters = searchConditions.filters
    var keywords = searchConditions.keywords
    var statusesCountMin = searchConditions.statusesCountMin
    var statusesCountMax = searchConditions.statusesCountMax
    var followersCountMin = searchConditions.followersCountMin
    var followersCountMax = searchConditions.followersCountMax
    var friendsCountMin = searchConditions.friendsCountMin
    var friendsCountMax = searchConditions.friendsCountMax
    var commentsCountMin = searchConditions.commentsCountMin
    var commentsCountMax = searchConditions.commentsCountMax
    var repostsCountMin = searchConditions.repostsCountMin
    var repostsCountMax = searchConditions.repostsCountMax
    var attitudesCountMin = searchConditions.attitudesCountMin
    var attitudesCountMax = searchConditions.attitudesCountMax
    var gender = searchConditions.gender

    return function(customer) {
      var result = true

      if (
        filters &&
        (containsFilters(customer.screenName, filters) ||
          containsFilters(customer.content, filters) ||
          containsFilters(customer.description, filters) ||
          containsFilters(customer.source, filters) ||
          containsFilters(customer.school, filters) ||
          containsFilters(customer.company, filters) ||
          containsFilters(customer.location, filters))
      ) {
        result = false
      }

      if (keywords && !containsKeywords(customer, keywords)) {
        result = false
      }

      if (statusesCountMin && customer.statusesCount < parseInt(statusesCountMin)) {
        result = false
      }

      if (statusesCountMax && customer.statusesCount > parseInt(statusesCountMax)) {
        result = false
      }

      if (followersCountMin && customer.followersCount < parseInt(followersCountMin)) {
        result = false
      }

      if (followersCountMax && customer.followersCount > parseInt(followersCountMax)) {
        result = false
      }

      if (friendsCountMin && customer.friendsCount < parseInt(friendsCountMin)) {
        result = false
      }

      if (friendsCountMax && customer.friendsCount > parseInt(friendsCountMax)) {
        result = false
      }

      if (commentsCountMin && customer.commentsCount < parseInt(commentsCountMin)) {
        result = false
      }

      if (commentsCountMax && customer.commentsCount > parseInt(commentsCountMax)) {
        result = false
      }

      if (repostsCountMin && customer.repostsCount < parseInt(repostsCountMin)) {
        result = false
      }

      if (repostsCountMax && customer.repostsCount > parseInt(repostsCountMax)) {
        result = false
      }

      if (attitudesCountMin && customer.attitudesCount < parseInt(attitudesCountMin)) {
        result = false
      }

      if (attitudesCountMax && customer.attitudesCount > parseInt(attitudesCountMax)) {
        result = false
      }

      if (gender && customer.gender != gender) {
        result = false
      }

      return result
    }
  }

  this.getAll = function(searchConditions, start, pageSize) {
    var customerFilter = getCustomerFilter(searchConditions)
    var customers = db.customers.toCollection().and(customerFilter).desc()

    var count = customers.count()
    customers = customers
      .offset(start)
      .limit(pageSize)
      .toArray()

    return Promise.all([customers, count]).then(function(values) {
      return Promise.resolve({
        list: values[0],
        count: values[1]
      })
    })
  }

  this.removeAll = function(ids) {
    var items = db.customers.toCollection()

    if (ids) {
      items = items.and(function(item) {
        return ids.indexOf(item.id) !== -1
      })
    }

    return items.delete()
  }
}.call(customerService))
