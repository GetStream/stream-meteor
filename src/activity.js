function get(obj, prop, context) {
  var value = obj[prop];

  if(_.isFunction(value)) {
    return value.apply(context || obj);
  } else {
    return value;
  }
}

BaseActivity = {
  activityTime: null,
  activityNotify: null,
  activityActorProp: 'actor', 
  activityExtraData: {},

  activityActorFeed() {},

  activityActor() {
    var actor = this[get(this, 'activityActorProp')];

    if (typeof (actor) === 'undefined') {
      throw new Error(`Activity field '${get(this, 'activityActorProp')}' is not present`);
    }

    return `${Meteor.users._name}:${actor}`;
  },

  activityObject() {
    return this;
  },

  activityForeignId() {
    return this._id;
  },

  createActivity() {
    var activity = {};

    var extra_data = get(this, 'activityExtraData');
    
    for (var key in extra_data) {
      activity[key] = extra_data[key];
    }

    activity.to = (get(this, 'activityNotify') || []).map(function(x) {
      return x.id;
    });

    activity.actor = get(this, 'activityActor');
    activity.verb = get(this, 'activityVerb');
    activity.object = get(this, 'activityObject');
    activity.foreign_id = get(this, 'activityForeignId');
    if (get(this, 'activityTime')) {
      activity.time = get(this, 'activityTime');
    }

    return activity;
  },

  getStreamBackend() {
    return new Stream.Backend();
  },
};
