Stream.Backend = StreamBackend = function() {};

StreamBackend.prototype = {
  isReference: function(field, value) {
    if (field === 'origin' || field === 'foreign_id') {
      return false;
    }

    if(typeof value === 'string' && value.split(':').length === 2) {
      var ref = value.split(':')[0];
      var collection = Mongo.Collection.get(ref);
      return collection && collection instanceof Mongo.Collection;
    }

    return false;
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

  enrichAggregatedActivities: function(aggregatedActivities) {
    for (var aggregated of aggregatedActivities) {
      this.enrichActivities(aggregated['activities']);
    }

    return aggregatedActivities;
  },

  serializeActivities: function(activities) {
    _(activities).each(activity => {

      _(activity).each((value, field) => {
        if(typeof value !== 'object' || value === null) return;
        activity[field] = this.serializeValue(value);
      });

    });
  },

  loadFromStorage: function(modelClass, objectsIds) {
    return modelClass.find({_id: {$in: objectsIds}}).fetch();
  },

  retreiveObjects: function(references) {
    var objects = {};
    var self = this;

    for (var modelRef of Object.keys(references)) {
      var refs = references[modelRef];
      var modelClass = self.getClassFromRef(modelRef);

      if (typeof (modelClass) === 'undefined') continue;
      if (typeof (objects[modelRef]) === 'undefined') objects[modelRef] = {};

      var objectsForRefs = self.loadFromStorage(modelClass, refs);

      for(let id of refs) {
        if(! _.findWhere(objectsForRefs, {_id: id})) {
          throw new Meteor.Error('not-enrichable', `Collection with name ${modelRef} does not contain item with id ${id}
hint: are you retrieving objects before the (feed) subscription is ready`);
        }
      }

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
        args.activity[args.field] = objects[args.modelRef][args.instanceRef];
      }
    });

    return activities;
  },

  enrichActivity: function(activity) {
    var self = this;
    var references = this.collectReferences([activity]);
    var objects = this.retreiveObjects(references);

    self.iterActivityFieldsWithReferences([activity], function(args) {
      if (objects[args.modelRef] && objects[args.modelRef][args.instanceRef] && args.field !== 'foreign_id') {
        args.activity[args.field] = objects[args.modelRef][args.instanceRef];
      }
    });

    return activity;
  },

  getClassFromRef: function(ref) {
    if (ref === 'user' || ref === 'users') {
      return Meteor.users;
    } else {
      var collection = Mongo.Collection.get(ref);

      if(! collection instanceof Mongo.Collection) {
        throw new Meteor.Error('non-collection', `couldn\'t find collection with name ${ref}`);
      }

      return collection;
    }
  },

  serializeValue: function(value) {
    if (value._id && value.getCollectionName) {
      return `${value.getCollectionName()}:${value._id}`;
    } else {
      return value;
    }
  },

  getIdFromRef: function(ref) {
    return ref.split(':')[1];
  },

};

Stream.backend = new Stream.Backend();