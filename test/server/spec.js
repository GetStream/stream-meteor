var backend = new Stream.Backend();
var activityNotify =[
	{ id: 'notification:1' },
	{ id: 'notification:2' },
];

var Tweets = new Mongo.Collection('tweets');

Stream.registerActivity(Tweets, {
	activityVerb: 'tweet',
	activityNotify: activityNotify,
	activityExtraData: function() {
		return {
			'bg': this.bg,
			'link': this.link ? `links:${this.link}` : '',
		};
	},
});

var Links = new Mongo.Collection('links');

var backend = new Stream.Backend();

describe('Collections', function() {
	
	beforeEach(function() {
		spyOn(Stream.feedManager, 'activityCreated');
		spyOn(Stream.feedManager, 'activityDeleted');
	});

	var userId = Meteor.users.insert({
			name: 'test-user'
		});

	it('transform on findOne', function() {
		var linkId = Links.insert({ href: 'http://getstream.io' });
		var link = Links.findOne(linkId);

		var tweetId = Tweets.insert({
			text: 'test',
			link: linkId,
			actor: userId,
		});

		var tw = Tweets.findOne(tweetId);

		expect(tw.activityNotify).toEqual(activityNotify);
		expect(tw.activityObject()).toEqual(tw);
		expect(tw.activityForeignId()).toEqual(tweetId);
		expect(tw.activityActor()).toEqual('users:' + userId);
		expect(tw.activityActorFeed()).toBeUndefined();
		expect(tw.getStreamBackend).toBeDefined();
	});

	it('transform on find', function() {
		var linkId = Links.insert({ href: 'http://getstream.io' });
		var link = Links.findOne(linkId);

		var tweetId = Tweets.insert({
			text: 'test',
			link: linkId,
			actor: userId,
		});

		var tw = Tweets.find(tweetId).fetch()[0];

		expect(tw.activityNotify).toEqual(activityNotify);
		expect(tw.activityObject()).toEqual(tw);
		expect(tw.activityForeignId()).toEqual(tweetId);
		expect(tw.activityActor()).toEqual('users:' + userId);
	});

	it('throws error on activity register without verb', function() {
		expect(function() {
			Stream.registerActivity(Tweets, {});
		}).toThrow();
	});
});

describe("Stream.Backend", function() {

	var userId = Meteor.users.insert({
			name: 'test-user'
		});
	
	var user = Meteor.users.findOne(userId);

	var linkId = Links.insert({
		href: 'http://getstream.io'
	});

	var link = Links.findOne(linkId);

	beforeEach(function() {
		spyOn(Stream.feedManager, 'activityCreated');
		spyOn(Stream.feedManager, 'activityDeleted');
	});

	it('has methods', function() {
		expect(backend.collectReferences).toBeDefined();
		expect(backend.enrichActivities).toBeDefined();
		expect(backend.enrichActivity).toBeDefined();
		expect(backend.enrichAggregatedActivities).toBeDefined();
	});

	it('to serialize null values', function() {
		var activity = {'object': null};

		backend.serializeActivities([activity]);
		var enriched = backend.enrichActivities([activity]);

		expect(enriched.length).toBe(1);
		expect(enriched[0].object).toBe(null);
	});

	it('doesn\'t serialize origin fields', function() {
		var activity = {'origin': 'user:42'};

		var enriched = backend.enrichActivities([activity]);

		expect(enriched.length).toBe(1);
		expect(enriched[0].origin).toBe('user:42');
	});

	it('to enrich one activity', function() {
		var tweetId = Tweets.insert({
			'text': 'test',
			'actor': userId
		}),
			tweet = Tweets.findOne(tweetId);

		var activity = tweet.createActivity();

		backend.serializeActivities([activity]);

		// Simulate an api request by serializing to json and parsing
		activity = JSON.parse( JSON.stringify(activity) );

		var enriched = backend.enrichActivities([activity]);

		expect(enriched.length).toBe(1);
		expect(enriched[0].actor).toEqual(user);
		expect(enriched[0].object._id).toEqual(tweet._id);
		expect(enriched[0].foreign_id).toEqual(tweetId);
	});

	it('throws Meteor.Error when enriching activity field that does not exist', function() {
		var activity = {
			object: 'links:undefined'
		};
		
		function test() {
			backend.enrichActivities([activity]);
		}
		
		expect(test).toThrowError(Meteor.Error);
	});

	it('enrich aggregated activity complex mix', function() {
		var self = this;

		var tweet1 = Tweets.findOne(Tweets.insert({
			text: 'tweet1',
			actor: userId,
		}));
		var tweet2 = Tweets.findOne(Tweets.insert({
			text: 'tweet2',
			actor: userId
		}));

		var activities1 = [tweet1.createActivity()];
		var activities2 = [tweet2.createActivity()];

		backend.serializeActivities(activities1);
		backend.serializeActivities(activities2);

		var aggregatedActivities = [
			{'actor_count': 1, 'activities': activities1},
			{'actor_count': 1, 'activities': activities2},
		];

		var enriched = backend.enrichAggregatedActivities(aggregatedActivities);

		expect(enriched.length).toBe(2);

		var firstAggregation = enriched[0];
		var secondAggregation = enriched[1];

		expect(firstAggregation.activities.length).toBe(1);
		expect(firstAggregation['activities'][0].actor).toBeDefined();
		expect(firstAggregation['activities'][0].object).toBeDefined();
		expect(firstAggregation['activities'][0].object._id).toBeDefined();
		expect(firstAggregation['activities'][0].verb).toBeDefined();
		expect(secondAggregation['activities'][0].actor).toBeDefined();
		expect(secondAggregation['activities'][0].object).toBeDefined();
		expect(secondAggregation['activities'][0].object._id).not.toBe(
			firstAggregation['activities'][0].object._id
		);
		expect(secondAggregation['activities'][0].verb).toBeDefined();
	});

	it('enrich aggregated activity', function() {
		var tweet = Tweets.findOne(Tweets.insert({
			text: 'test',
			actor: userId
		}));

		var activity = tweet.createActivity();
		backend.serializeActivities([activity]);

		var aggregatedActivities = [
			{'actor_count': 1, 'activities': [activity]}
		];

		var enriched = backend.enrichAggregatedActivities(aggregatedActivities);

		expect(enriched.length).toBe(1);
		expect(enriched[0].activities.length).toBe(1);
		expect(enriched[0]['activities'][0].actor).toBeDefined();
		expect(enriched[0]['activities'][0].object).toBeDefined();
		expect(enriched[0]['activities'][0].verb).toBeDefined();
	});

	it('to populate extra data', function() {
		var tweetId = Tweets.insert({
				'text': 'test',
				'bg': 'bgvalue',
				'actor': userId,
				'link': linkId,
			}),
			tweet = Tweets.findOne(tweetId);

		var activity = tweet.createActivity();

		backend.serializeActivities([activity]);

		activity = JSON.parse( JSON.stringify(activity) );

		var enriched = backend.enrichActivities([activity]);

		expect(enriched.length).toEqual(1);
		expect(enriched[0].bg).toEqual('bgvalue');
		expect(enriched[0].link).toEqual(link);
	});

	it('to serialize custom fields', function() {
		var tweetId = Tweets.insert({
				'text': 'test',
				'bg': 'bgValue',
				'actor': userId,
				'link': linkId,
			}),
			tweet = Tweets.findOne(tweetId);

		var activity = tweet.createActivity();

		backend.serializeActivities([activity]);

		expect(activity.actor).toEqual(`users:${userId}`);
		expect(activity.link).toEqual(`links:${linkId}`);
		expect(activity.bg).toEqual('bgValue');
		expect(activity.object).toEqual(`tweets:${tweetId}`);
	});

	it('to enrich multiple activities', function() {
		var tweet1Id = Tweets.insert({
				'text': 'test2',
				'actor': userId,
			});

		var tweet2Id = Tweets.insert({
				'text': 'test2',
				'actor': userId,
			});

		var tweet1 = Tweets.findOne(tweet1Id),
			tweet2 = Tweets.findOne(tweet2Id);

		var activities = [tweet1.createActivity(), tweet2.createActivity()];

		backend.serializeActivities(activities);
		var enriched = backend.enrichActivities(activities);

		expect(enriched.length).toEqual(2);

		expect(enriched[0].foreign_id).toBeDefined();
		expect(enriched[1].foreign_id).toBeDefined();

		expect(enriched[0].foreign_id).not.toEqual(enriched[1].foreign_id);
	});
});

xdescribe("Stream.ActivityCollection", function() {

	var userId = Meteor.users.insert({
			name: 'test-user'
		});
	
	var user = Meteor.users.findOne(userId);

	var linkId = Links.insert({
		href: 'http://getstream.io'
	});

	var link = Links.findOne(linkId);

	beforeEach(function() {
		spyOn(Stream.feedManager, 'activityCreated');
		spyOn(Stream.feedManager, 'activityDeleted');
	});

	it("calls activityCreated feedManager the feedmanager after insertion", function() {
		Tweets.insert({
			'text': 'test',
			'actor': this.user,
		});

		expect(Stream.feedManager.activitycreated).toHaveBeenCalled();
	});

	it("calls activityDeleted feedManager the feedmanager after deletion", function() {
		var tweetId = Tweets.insert({
			text: 'text'
		});

		Tweets.remove(tweetId);

		expect(Stream.feedManager.activitydeleted).toHaveBeenCalled();
	});
});

describe('Stream.activity', function() {
	var userId = Meteor.users.insert({
			name: 'test-user'
		});

	beforeEach(function() {
		spyOn(Stream.feedManager, 'activityCreated');
		spyOn(Stream.feedManager, 'activityDeleted');
	});

	it('check to target field', function() {
		var tweetId = Tweets.insert({
			actor: userId,
		});

		var tweet = Tweets.findOne(tweetId),
			activity = tweet.createActivity();

		expect(activity.to).toEqual(['notification:1', 'notification:2']);

	});

	it('should be able to serialise to ref', function() {
		var tweetId = Tweets.insert({});
		var tweet = Tweets.findOne(tweetId);

		var ref = backend.serializeValue(tweet);
		expect(ref).toBe('tweets:' + tweet._id);
	});

	it('#createActivity().activityVerb', function() {
		var tweetId = Tweets.insert({
			actor: userId
		});
		var tweet = Tweets.findOne(tweetId);
		var activity = tweet.createActivity();

		expect(activity.verb).toBe('tweet');
	});

	it('#createActivity().activityObject', function() {
		var tweetId = Tweets.insert({
			actor: userId
		});
		var tweet = Tweets.findOne(tweetId);
		var activity = tweet.createActivity();

		expect(activity.object).toBe(tweet);
	});

	it('#createActivity() with activityVerb function', function() {
		var Activities = new Mongo.Collection('activities');

		Stream.registerActivity(Activities, {
			activityVerb: function() {
				return this.verb;
			}
		});

		var id = Activities.insert({
			text: 'some-text',
			verb: 'tweet',
			actor: '1'
		});

		var tweet = Activities.findOne(id),
			activity = tweet.createActivity();

		expect(activity.verb).toBe('tweet');
	});

	it('#createActivity().activityActor', function() {
		var tweetId = Tweets.insert({
			actor: userId
		});
		var tweet = Tweets.findOne(tweetId);
		var activity = tweet.createActivity();

		expect(activity.actor).toBe('users:' + userId);
	});
});

describe("Stream.feedManager", function() {
	beforeEach(function() {
		spyOn(Stream.feedManager.client, "feed").and.returnValue({ token: "some-token" });
	});

	it("#getNotificationFeedToken", function() {
		expect(Stream.feedManager.getNotificationFeedToken).toBeDefined();

		var token = Stream.feedManager.getNotificationFeedToken("some-user-id");

		expect(Stream.feedManager.client.feed).toHaveBeenCalled();
		expect(token).toEqual('some-token');
	});

	it("#getUserFeedToken", function() {
		expect(Stream.feedManager.getUserFeedToken).toBeDefined();

		var token = Stream.feedManager.getUserFeedToken("some-user-id");

		expect(Stream.feedManager.client.feed).toHaveBeenCalled();
		expect(token).toEqual('some-token');
	});

	it("#getNewsFeedsTokens", function() {
		expect(Stream.feedManager.getNewsFeedsTokens).toBeDefined();

		var tokens = Stream.feedManager.getNewsFeedsTokens("some-user-id");

		expect(Stream.feedManager.client.feed).toHaveBeenCalled();
		expect(tokens['flat']).toEqual('some-token');
		expect(tokens['aggregated']).toEqual('some-token');
	});
});
