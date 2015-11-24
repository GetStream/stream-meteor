Stream.Backend = StreamBackend = function() {
};

_.extend(StreamBackend.prototype, {
  isReference: function(field, value) {
    if (field === 'origin' || field === 'foreign_id') {
      return false;
    }

    return (typeof (value) === 'string' && value.split(':').length == 2);
  },

  iterActivityFields: function(activities, filter, fn) {
    for (var i in activities) {
      var activity = activities[i];
      for (var field in activity) {
        if (!filter(field, activity[field])) continue;
        var args = {
          'activity': activity,
          'field': field,
        };
        fn(args);
      }
    }
  },

  iterActivityFieldsWithObjects: function(activities, fn) {
    this.iterActivityFields(activities, function(field, value) { return (value !==  null && typeof (value) === 'object');}, fn);
  },

  iterActivityFieldsWithReferences: function(activities, fn) {
    var self = this;
    this.iterActivityFields(activities, this.isReference, function(args) {
      var field = args['field'];
      args['modelRef'] = args['activity'][field].split(':')[0];
      args['instanceRef'] = args['activity'][field].split(':')[1];
      fn(args);
    });
  },

  collectReferences: function(activities) {
    var modelReferences = {};
    this.iterActivityFieldsWithReferences(activities, function(args) {
      if (modelReferences[args.modelRef]) {
        modelReferences[args.modelRef].push(args.instanceRef);
      } else {
        modelReferences[args.modelRef] = [args.instanceRef];
      }
    });

    return modelReferences;
  },

  enrichAggregatedActivities: function(aggregatedActivities, callback) {
    for (var aggregated of aggregatedActivities) {
      this.enrichActivities(aggregated['activities']);
    }

    return aggregatedActivities;
  },

  serializeActivities: function(activities) {
    var self = this;
    this.iterActivityFieldsWithObjects(activities, function(args) {
      var value = args.activity[args.field];
      args.activity[args.field] = self.serializeValue(value);
    });
  },

  loadFromStorage: function(modelClass, objectsIds, callback) {
    return modelClass.find({_id: {$in: objectsIds}}).fetch();
  },

  retreiveObjects: function(references, callback) {
    var objects = {};
    var self = this;

    for (var modelRef of Object.keys(references)) {
      var refs = references[modelRef];
      var modelClass = self.getClassFromRef(modelRef);
      if (typeof (modelClass) === 'undefined') continue;
      if (typeof (objects[modelRef]) === 'undefined') objects[modelRef] = {};

      var objectsForRefs = self.loadFromStorage(modelClass, refs);

      for (var obj of objectsForRefs) {
        objects[modelRef][obj._id] = obj;
      }
    }

    return objects;
  },

  enrichActivities: function(activities) {
    var self = this;
    var references = this.collectReferences(activities);
    var objects = this.retreiveObjects(references);

    self.iterActivityFieldsWithReferences(activities, function(args) {
      if (objects[args.modelRef] && objects[args.modelRef][args.instanceRef] && args.field !== 'foreign_id') {
        args.activity[args.field] = self.populate(objects[args.modelRef][args.instanceRef]);
      }
    });

    return activities;
  },

  populate: function(object) {
    if (typeof object.populate === 'function') {
      object.populate();
    }

    return object;
  },

  getClassFromRef: function(ref) {
    if (ref === 'user' || ref === 'users') {
      return Meteor.users;
    } else {
      return Mongo.Collection.get(ref);
    }
  },

  serializeValue: function(value) {
    if (value._id) {
      return `${value.collectionName()}:${value._id}`;
    } else {
      return value;
    }
  },

  getIdFromRef: function(ref) {
    return ref.split(':')[1];
  },

});

