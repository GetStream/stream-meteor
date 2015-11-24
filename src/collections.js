Stream.activityCollection = function(name, options) {
  var _helpers = {};

  _.extend(_helpers, BaseActivity, options.methods, {
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

// ActivityCollection = function(name, verb) {
// 	Mongo.Collection.call(this, name, {
// 		transform: this.transform.bind(this)
// 	});

// 	this._name = name;
// 	this._verb = verb;
// 	this._methods = {};
// 	this._statics = {};

// 	if(Meteor.isServer) {
// 		//this.after.insert(this.afterInsert.bind(this));
// 	}
// }

// ActivityCollection.prototype = Object.create(Mongo.Collection.prototype);

// _.extend(ActivityCollection.prototype, {
// 	afterInsert: function (userId, doc) {
// 		// Perform transformation as if document was retrieved from Mongo
// 		// This way we have access to methods on doc
// 		doc = this.transform(doc);

// 		FeedManager.activityCreated(doc);
// 	},

// 	transform: function (doc) {
// 		var self = this;
// 		var Activity = _.extend(BaseActivity, this._methods, {
// 				activityVerb : function() {
// 					return self._verb;
// 				},

// 				collectionName : function() {
// 					return self._name;
// 				}
// 			}),
// 			// Create an object with Activity as its prototype
// 			activity = Object.create(Activity);

// 		return _.extend(activity, doc);
// 	},

// 	methods: function (mts) {
// 		_.extend(this._methods, mts);
// 	},

// 	statics: function (sts) {
// 		_.extend(this._statics, sts);
// 	}
// });

