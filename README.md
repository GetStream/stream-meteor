[![Build Status](https://travis-ci.org/GetStream/stream-meteor.svg](https://travis-ci.org/GetStream/stream-meteor)

This package helps you create activity streams & newsfeeds with MeteorJS and [GetStream.io](https://getstream.io).

##Build activity streams & news feeds

<p align="center">
  <img src="https://dvqg2dogggmn6.cloudfront.net/images/mood-home.png" alt="Examples of what you can build" title="What you can build"/>
</p>

You can build:

* Activity streams such as seen on Github
* A twitter style newsfeed
* A feed like instagram/pinterest
* Facebook style newsfeeds
* A notification system

## Demo

You can check out our example app built using this library on Github [https://github.com/GetStream/Stream-Example-Meteor](https://github.com/GetStream/Stream-Example-Meteor)

##Installation

Add the package to your Meteor by app by running the following command:

```meteor add getstream:stream-meteor```

Add the following keys to your settings.json ([Meteor settings](http://docs.meteor.com/#/full/meteor_settings)) with their respective values retrieved from your [dashboard](https://getstream.io/dashboard/)

```
"streamApiSecret": "",

"public" : {
  "streamApiKey": "",

  "streamApiAppId": ""
}
```

Read more about how to use a settings.json file at the [Meteor Chef](https://themeteorchef.com/snippets/making-use-of-settings-json/)

##Collection integration

Stream Meteor can automatically publish new activities to your feeds. To do that you only need to register the collections you want to publish with this library.

```js
Tweets = Mongo.Collection.('tweets');

Stream.registerActivity(Tweets, {
  activityVerb: 'tweet',
});
```

Every time a Tweet is created it will be added to the user's feed. Users which follow the given user will also automatically get the new tweet in their feeds.

###Activity fields

Collections are stored in feeds as activities. An activity is composed of at least the following fields: **actor**, **verb**, **object**, **time**. You can also add more custom data if needed. By registering a collection as an activity collection the integration library tries to setup things automatically:

**object** is a reference to the collection instance
**actor** is a reference to the actor attribute of the instance

By default the actor field will look for an attribute called actor and a field called created_at to track creation time.
If you're user field is called differently you'll need to tell us where to look for it.
Below shows an example how to set things up if your user field is called author.

```js
Stream.registerActivity(Tweets, {
  activityActorProp: 'user';
});
```

Properties supplied in the second argument of ``registerActivity`` are automatically added on a document instance's prototype through the Mongo collection (transform)[http://docs.meteor.com/#/full/mongo_collection] method.

###Activity extra data

Often you'll want to store more data than just the basic fields. You achieve this by implementing the **extraActivityData** method on the document instance:

```js
Stream.registerActivity(Tweets, {
  activityVerb: 'tweet',
  activityExtraData: function() {
    return {
      'isRetweet': this.isRetweet
    };
  }
});
```

###Other fields

* **activityNotify** array of feeds to notify when document is inserted into collection
* **activityActorFeed** which feed the activity is added to on creation
* **activityTime** created at time set on the activity object that is send to the getstream API
* **activityActorProp** which property holds the user id of current activity's actor
* **activityExtraData** extra data set on the activity object that is send to the getstream API

##Feed manager

This packages comes with a FeedManager class that helps with all common feed operations. This class can be accessed from both the client and the server, to use the FeedManager on the client consult the section *Using feed manager on the client*. 


###Feeds bundled with feed_manager

To get you started the manager has 4 feeds pre configured. You can add more feeds if your application needs it.
The three feeds are divided in three categories.

###User feed:
The user feed stores all activities for a user. Think of it as your personal Facebook page. You can easily get this feed from the manager.  
```js
Stream.feedManager.getUserFeed(this.user);
```  

###News feeds:
The news feeds store the activities from the people you follow. 
There is both a flat newsfeed (similar to twitter) and an aggregated newsfeed (like facebook).

```js
var flatFeed = Stream.feedManager.getNewsFeeds(foundUser.id)['flat'];
var aggregatedFeed = Stream.feedManager.getNewsFeeds(this.user)['aggregated'];
```

###Notification feed:
The notification feed can be used to build notification functionality. 

<p align="center">
  <img src="http://feedly.readthedocs.org/en/latest/_images/fb_notification_system.png" alt="Notification feed" title="Notification feed"/>
  
```js
var notificationFeed = Stream.feedManager.getNotificationFeed(this.userId);
```

###Realtime updates
All feeds can return realtime updates by subscribing through their ``subscribe`` method:

```js
notificationFeed.subscribe(function(data) {
	// Show user a notification
});
```

###Follow a feed
The create the newsfeeds you need to notify the system about follow relationships. The manager comes with APIs to let a user's news feeds follow another user's feed. This code lets the current user's flat and aggregated feeds follow the target_user's personal feed.

```
Stream.feedManager.followUser(userId, targetId);
```

###Using feed managers on the client
The server has access to your getstream.io secret key, this makes it possible to edit feeds of any user. For obvious security reasons the client does not have access to all feeds, and to grant it access to the feed of the current user we need to generate a feed token. 

```js
var notificationFeedToken = Stream.feedManager.getNotificationFeedToken(this.userId);
```

Use Meteor (server) methods to retrieve feed tokens from the client e.g.:

```js
if(Meteor.isServer) {
	Meteor.methods({
		'notificationFeedToken': function() {
			if(! this.userId) {
				throw new Meteor.Error('not-authorized');
			}
			
			return Stream.feedManager.getNotificationFeedToken(this.userId);
		}
	});
}
```

To subscribe to the notification feed on the client call the method and retrieve a feed instance from the feedManager:

```js
Meteor.call('notificationFeedToken', function(err, token) {
	if(err) console.error(err);
	
	var feed = Stream.feedManager.notificationFeed(Meteor.userId(), token);
	
	feed.subscribe(function(data) {
		// Respond to data
	});
});
```

## Showing the newsfeed

###Activity enrichment

When you read data from feeds, a like activity will look like this:

```
{'actor': 'User:1', 'verb': 'like', 'object': 'Like:42'}
```

This is far from ready for usage in your template. We call the process of loading the references from the database enrichment. An example is shown below:

```js
if(Meteor.isServer) {
	Meteor.methods({
  	activities: function() {
    	var flatFeed = Stream.FeedManager.getNewsFeeds(this.userId)['flat'],
        	feed = Stream.await(flatFeed.get({})),
        	activities = feed.results;
	
	    return activities;
  	}
	});
}
```

This method defined on the server can be called by clients to retrieve activities for the current user. Notice that we use the utility method ``Stream.await`` to convert the promise returned by ``flatFeed.get`` to a [future](https://www.npmjs.com/package/future)

On the client we retrieve the activities and use the Stream backend to enrich the activities with data from our Mongo database:

```js
Meteor.call('activities', function(err, activities) {
	if(err) console.error(err);

	var enriched = backend.enrichActivities(activities);
	
	// Do something with the enriched activities
});
```

##Low level APIs access
When needed you can also use the low level JS API directly.
The full explanation can be found in the [getstream.io documentation](https://getstream.io/docs/).

##Contributing

###Running tests

To run the tests first install the velocity-cli:

```
npm install -g velocity-cli
```

Then run ``velocity test-packages`` from the package directory. The test page is now served at ``http://localhost:3000``.

To run the (server) tests from the command line use velocity's ``--ci`` command line option.
