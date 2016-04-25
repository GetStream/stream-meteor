Stream.registerActivity = function(collection, activityDocProps) {
  check(activityDocProps, Match.ObjectIncluding({
    activityVerb: Match.OneOf(String, Function)
  }));

  var transform = function Document(doc) {
    var base = _.extend(_.clone(BaseActivity), {
      getCollectionName: () => collection._name,
    }, activityDocProps);

    return _.extend(Object.create(base), doc);
  };

  var afterInsert = function(userId, doc) {
    doc = transform(this.transform(doc));
    Stream.feedManager.activityCreated(doc);
  };

  var afterRemove = function(userId, doc) {
    doc = transform(this.transform(doc));
    Stream.feedManager.activityDeleted(doc);
  };

  if (Meteor.isServer) {
    collection.after.insert(afterInsert);

    collection.after.remove(afterRemove);
  }

  var beforeFind = function(userId, selector, options={}) {
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

Stream.setPublishFields = function(publishFields) {
  Stream.publishFields = publishFields;
}

Stream.feeds = {};

var feeds = _(Stream._settings.newsFeeds).pairs();

feeds.push([Stream._settings.userFeed, 'flat']);
feeds.push([Stream._settings.notificationFeed, 'notification']);

Stream.notifications = new Mongo.Collection('Stream.notifications');

_(feeds).each(([feedGroup, feedType]) => {

  Stream.feeds[feedGroup] = new Mongo.Collection(`Stream.feeds.${feedGroup}`, {
    transform: function(doc) {
      if(feedType === 'aggregated') {
        Stream.backend.enrichAggregatedActivities([doc]);

        return doc;
      } else if(feedType === 'notification') {
        Stream.backend.enrichActivities(doc.activities);

        return doc;
      } else /* flat feed */ {
        Stream.backend.enrichActivity(doc);

        return doc;
      }
    }
  });

});
