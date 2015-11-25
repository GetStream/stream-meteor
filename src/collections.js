Stream.activityCollection = function(name, options) {
  var _helpers = {};

  _.extend(_helpers, BaseActivity, options.transform, {
    activityVerb: function() {
      return options.verb;
    },

    collectionName: function() {
      return name;
    },
  });

  options = _.extend({
    methods: {},
    verb: '',
    transform: function Document(doc) {
      return _.extend(Object.create(_helpers), doc);
    },
  }, options);

  var collection = new Mongo.Collection(name, { transform: options.transform });

  var afterInsert = function(userId, doc) {
    doc = collection._transform(doc);

    FeedManager.activityCreated(doc);
  };

  var afterRemove = function(userId, doc) {
    doc = collection._transform(doc);

    FeedManager.activityDeleted(doc);
  };

  if (Meteor.isServer) {
    collection.after.insert(afterInsert);

    collection.after.remove(afterRemove);
  }

  return collection;
};

