function publish(name, getFeed, collectReferences, getParams={}) {
	var publication;

	function streamSubscriptionHandle(data) {
		var refs = collectReferences(data.new);

		_(refs).each((ids, model) => {
			var collection = Mongo.Collection.get(model);

			if(! collection instanceof Mongo.Collection) {
		        throw new Meteor.Error('non-collection', `couldn\'t find collection with name ${ref}`);
			}

			_(ids).each((id) => publication.added(model, id, collection.findOne(id)));
		});

		_(data.new).each(activity => publication.added(name, activity.id, activity));
		_(data.deleted).each(activity => publication.removed(name, activity.id));

		publication.ready();
	}

	Meteor.publish(name, function(limit=20, userId=undefined /* subscribe params */) {
		publication = this;

		if (!this.userId) {
		  throw new Meteor.Error('not-authorized', 'You can only subscribe to feeds when authenticated');
		}

		_(getParams).defaults({
			limit: limit
		});

		var streamFeed = getFeed(userId || this.userId),
			feed = Stream.await(streamFeed.get(getParams)),
		    activities = feed.results;

		activities.forEach(activity => {
			publication.added(name, activity.id, activity);
		});

		var refs = collectReferences(activities);
		var cursors = [];

		_(refs).each((ids, model) => {
			var collection = Mongo.Collection.get(model);

			if(! collection instanceof Mongo.Collection) {
		        throw new Meteor.Error('non-collection', `couldn\'t find collection with name ${ref}`);
			}

			cursors.push(collection.find({ _id: { $in: ids } }));
		});

		var boundStreamSubscriptionHandle = Meteor.bindEnvironment(streamSubscriptionHandle);
		var streamSubscription = streamFeed.subscribe(boundStreamSubscriptionHandle);

		this.onStop(function() {
			streamSubscription.cancel();
		});

		return cursors;
	});
}

function getNewsFeed(feedGroup, userId) {
	return Stream.feedManager.getNewsFeeds(userId)[feedGroup];
}

function getUserFeed(userId) {
	return Stream.feedManager.getUserFeed(userId);
}

function getNotificationFeed(userId) {
	return Stream.feedManager.getNotificationFeed(userId);
}

function aggregatedCollectReferences(aggregated) {
	aggregated = _.chain(aggregated)
		.map(aggregation => aggregation['activities'])
		.flatten()
		.value();

	return Stream.backend.collectReferences(aggregated);
}

_(Stream._settings.newsFeeds).each((feedGroup, feedType) => {
	var collect = Stream.backend.collectReferences.bind(Stream.backend);

	if(feedType === 'aggregated') {
		collect = aggregatedCollectReferences;
	}

	publish(`Stream.feed.${feedGroup}`, _.partial(getNewsFeed, feedGroup), collect);	
});

publish('Stream.feed.notification', getNotificationFeed, aggregatedCollectReferences);
publish('Stream.feed.user', getUserFeed, Stream.backend.collectReferences.bind(Stream.backend));