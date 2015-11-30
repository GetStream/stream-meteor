Stream.registerActivity = function(collection, activityDocProps) {
  var transform = function Document(doc) {
    var base = _.extend(BaseActivity, {
      getCollectionName: () => collection._name,
    }, activityDocProps);

    return _.extend(Object.create(base), doc);
  };

  var afterInsert = function(userId, doc) {
    doc = this.transform(doc);
    FeedManager.activityCreated(doc);
  };

  var afterRemove = function(userId, doc) {
    doc = this.transform(doc);
    FeedManager.activityDeleted(doc);
  };

  if (Meteor.isServer) {
    collection.after.insert(afterInsert);

    collection.after.remove(afterRemove);
  }

  var beforeFind = function(userId, selector, options) {
    var _transform = options.transform;

    options.transform = function Document(doc) {
      if(_.isFunction(_transform)) {
        doc = _transform(doc);
      }

      doc = transform(doc);

      return doc;
    };
  };

  collection.before.find(beforeFind);

  collection.before.findOne(beforeFind);

  return collection;
};

