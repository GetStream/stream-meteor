function streamSubscriptionHandleFactory(name, collectReferences, publication, streamFeed) {

	return function streamSubscriptionHandle(data) {
		var refs = collectReferences(data.new);

		_(refs).each((ids, model) => {
			var collection = Mongo.Collection.get(model);

			if(! collection instanceof Mongo.Collection) {
		        throw new Meteor.Error('non-collection', `couldn\'t find collection with name ${ref}`);
			}

			_(ids).each((id) => publication.added(model, id, collection.findOne(id)));
		});

		_(data.new).each(activity => publication.added(name, activity.id, activity));

		_(data.deleted).each(activityId => publication.removed(name, activityId));

		if ((data.unread != null) && (data.unseen != null)) {
			let notification = Stream.notifications.findOne({ feedGroup: streamFeed.slug, feedId: streamFeed.userId });
			// console.log("!!! notification", notification);
			// console.log("!!! publication", publication);
			if (notification) {
				publication.changed('Stream.notifications', notification._id, { unread: data.unread, unseen: data.unseen });
			}
		}

		publication.ready();
	};

}

function publish(name, getFeed, collectReferences, getParams={}) {
	Meteor.publish(name, function(limit=20, userId=undefined /* subscribe params */) {
		var publication = this;
		var streamFeed;
		var cursors = [];

		userId = userId || this.userId;

		if(! userId) {
			return publication.ready();
		}

		if (!this.userId) {
		  throw new Meteor.Error('not-authorized', 'You can only subscribe to feeds when authenticated');
		}

		_(getParams).defaults({
			limit: limit
		});

		streamFeed = getFeed(userId);

		var	feed = Stream.await(streamFeed.get(getParams)),
		    activities = feed.results;

		var feedSelector = { feedGroup: streamFeed.slug, feedId: streamFeed.userId }
		  , dbFeed = Stream.notifications.findOne(feedSelector);

		if (! dbFeed && (feed.unread != null) && (feed.unseen != null)) {
			Stream.notifications.insert(_(feedSelector).extend({ unread: feed.unread, unseen: feed.unseen }));
		} else if((feed.unread != null) && (feed.unseen != null)) {
			Stream.notifications.update(dbFeed._id, { $set: { unread: feed.unread, unseen: feed.unseen }});
		}

		if ((feed.unread != null) && (feed.unseen != null)) {
			cursors.push(Stream.notifications.find(feedSelector));
		}

		activities.forEach(activity => {
			publication.added(name, activity.id, activity);
		});

		var refs = collectReferences(activities);

		_(refs).each((ids, model) => {
			var collection = Mongo.Collection.get(model);

			if(! collection instanceof Mongo.Collection) {
		        throw new Meteor.Error('non-collection', `couldn\'t find collection with name ${ref}`);
			}

			cursors.push(collection.find({ _id: { $in: ids } }));
		});

		var streamSubscriptionHandle = streamSubscriptionHandleFactory(name, collectReferences, publication, streamFeed);
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

_(Stream._settings.newsFeeds).each((feedType, feedGroup) => {
	var collect = Stream.backend.collectReferences.bind(Stream.backend);

	if(feedType === 'aggregated') {
		collect = aggregatedCollectReferences;
	}

	publish(`Stream.feeds.${feedGroup}`, _.partial(getNewsFeed, feedGroup), collect);	
});

publish('Stream.feeds.notification', getNotificationFeed, aggregatedCollectReferences);
publish('Stream.feeds.user', getUserFeed, Stream.backend.collectReferences.bind(Stream.backend));