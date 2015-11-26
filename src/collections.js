Stream.activityCollection = function(name, options) {
  var _helpers = {};

  // Only call populate once
  // if(options.transform && options.transform.populate) {
  //   options.transform.populate = function() {
  //     if(! this._populated) {
  //       options.transform.populate.apply(this, arguments);
  //       this._populated = true;
  //     }
  //   };
  // }

  _.extend(_helpers, BaseActivity, options.transform, {
    activityVerb: function() {
      return options.verb;
    },

    collectionName: function() {
      return name;
    },
  });

  var transform = function Document(doc) {
    return _.extend(Object.create(_helpers), doc);
  };

  var collection = new Mongo.Collection(name, { transform });

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

