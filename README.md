[![Build Status](https://travis-ci.org/tbarbugli/stream-meteor.svg)](https://travis-ci.org/tbarbugli/stream-meteor)
[![npm version](https://badge.fury.io/js/getstream-meteor.svg)](http://badge.fury.io/js/getstream-meteor)

This package helps you create activity streams & newsfeeds with MeteorJS and [GetStream.io](https://getstream.io).

###Build activity streams & news feeds

<p align="center">
  <img src="https://dvqg2dogggmn6.cloudfront.net/images/mood-home.png" alt="Examples of what you can build" title="What you can build"/>
</p>

You can build:

* Activity streams such as seen on Github
* A twitter style newsfeed
* A feed like instagram/pinterest
* Facebook style newsfeeds
* A notification system

### Demo

You can check out our example app built using this library on Github [https://github.com/GetStream/Stream-Example-Meteor](https://github.com/GetStream/Stream-Example-Meteor)

###Installation

Install getstream_node package with npm:

```meteor add getstream:stream-meteor```

Add the following keys to your settings.json ([Meteor settings](http://docs.meteor.com/#/full/meteor_settings)) with their respective values retrieved from your [dashboard](https://getstream.io/dashboard/)

```
"streamApiSecret": "",

"public" : {
  "streamApiKey": "",

  "streamApiAppId": ""
}
```

###Collection integration

Stream Meteor can automatically publish new activities to your feeds. To do that you only need to register the collections you want to publish with this library.

```js
Tweets = Mongo.Collection.('tweets');

Stream.registerActivity(Tweets, {
  activityVerb: 'tweet',
});
```

Every time a Tweet is created it will be added to the user's feed. Users which follow the given user will also automatically get the new tweet in their feeds.

####Activity fields

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

#####Activity extra data

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

#####Other fields

* **activityNotify** array of feeds to notify when document is inserted into collection
* **activityActorFeed** which feed the activity is added to on creation
* **activityTime** created at time set on the activity object that is send to the getstream API
* **activityActorProp** which property holds the user id of current activity's actor
* **activityExtraData** extra data set on the activity object that is send to the getstream API

###Feed manager

This packages comes with a feed_manager class that helps with all common feed operations.  

####Feeds bundled with feed_manager

To get you started the manager has 4 feeds pre configured. You can add more feeds if your application needs it.
The three feeds are divided in three categories.

#####User feed:
The user feed stores all activities for a user. Think of it as your personal Facebook page. You can easily get this feed from the manager.  
```js
Stream.FeedManager.getUserFeed(this.user);
```  

#####News feeds:
The news feeds store the activities from the people you follow. 
There is both a flat newsfeed (similar to twitter) and an aggregated newsfeed (like facebook).

```js
var flatFeed = Stream.FeedManager.getNewsFeeds(foundUser.id)['flat'];
var aggregatedFeed = Stream.FeedManager.getNewsFeeds(this.user)['aggregated'];
```

#####Notification feed:
The notification feed can be used to build notification functionality. 

<p align="center">
  <img src="http://feedly.readthedocs.org/en/latest/_images/fb_notification_system.png" alt="Notification feed" title="Notification feed"/>
  
NOT IMPLEMENTED

####Follow a feed
The create the newsfeeds you need to notify the system about follow relationships. The manager comes with APIs to let a user's news feeds follow another user's feed. This code lets the current user's flat and aggregated feeds follow the target_user's personal feed.

```
Stream.FeedManager.followUser(userId, targetId);
```

### Showing the newsfeed

####Activity enrichment

When you read data from feeds, a like activity will look like this:

```
{'actor': 'User:1', 'verb': 'like', 'object': 'Like:42'}
```

This is far from ready for usage in your template. We call the process of loading the references from the database enrichment. An example is shown below:

```js
Meteor.methods({
  activities: function() {
    var flatFeed = Stream.FeedManager.getNewsFeeds(this.userId)['flat'],
        feed = await(flatFeed.get({})),
        activities = feed.results;

    return activities;
  }
});
```

Promises are used to pipe the asynchronous result of `flatFeed.get` and `StreamBackend.enrichActivities` through our code.

###Temporarily disabling the model sync

Model syncronization can be disabled manually via environment variable.

NOT IMPLEMENTED

###Low level APIs access
When needed you can also use the low level JS API directly.
The full explanation can be found in the [getstream.io documentation](https://getstream.io/docs/).
