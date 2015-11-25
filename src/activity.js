BaseActivity = {
  activityActorFeed: function() {
    return null;
  },

  activityGetActor: function() {
    var prop = _.isFunction(this.activityActorProp) ? this.activityActorProp() : this.activityActorProp;
    var actor = this[prop];
    if (typeof (actor) === 'undefined') {
      throw new Error(`Activity field '${this.activityActorProp()}' is not present`);
    }

    return `${Meteor.users._name}:${actor}`;
  },

  activityActor: function() {
    var actor = this.activityGetActor();
    return actor;
  },

  activityObject: function() {
    return this;
  },

  activityForeignId: function() {
    return this._id;
  },

  createActivity: function() {
    var activity = {};
    var extra_data = this.activityExtraData();
    for (var key in extra_data) {
      activity[key] = extra_data[key];
    }

    activity.to = (this.activityNotify() || []).map(function(x) {return x.id;});

    activity.actor = this.activityActor();
    activity.verb = this.activityVerb();
    activity.object = this.activityObject();
    activity.foreign_id = this.activityForeignId();
    if (this.activityTime()) {
      activity.time = this.activityTime();
    }

    return activity;
  },

  activityActorProp: 'user',

  activityExtraData: function() {
    return {};
  },

  activityTime: function() {},

  activityNotify: function() {},

  referencesPaths: function() {
    return {};
  },

  getStreamBackend: function() {
    return new Stream.Backend();
  },

  populate: function() {},
};
