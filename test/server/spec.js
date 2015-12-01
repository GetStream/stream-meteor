var backend = new Stream.Backend();

var activityNotify =[
	{ id: 'notification:1' },
	{ id: 'notification:2' },
];

var Tweets = Mongo.Collection('tweets', {
	transform: function(doc) {
		var base = {
			getLink: function() {
				return Links.findOne(this.link);
			},

			populate: function() {
				if(this.link) {
					this.link = this.getLink();
				}
			},
		};

		return _.extend(Object.create(base), doc);
	}
});

Stream.registerActivity(Tweets, {
	activityVerb: 'tweet',
	activityNotify: activityNotify,
	activityExtraData: function() {
		return {
			'bg': this.bg,
			'link': `links:${this.link}`,
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
		expect(tw.getLink()).toEqual(link);
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
		expect(tw.getLink()).toEqual(link);
		expect(tw.activityObject()).toEqual(tw);
		expect(tw.activityForeignId()).toEqual(tweetId);
		expect(tw.activityActor()).toEqual('users:' + userId);
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

	it('enrich aggreagted activity', function() {
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

	it('to populate custom fields', function() {
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
		expect(enriched[0].object.link).toEqual(link);
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

		expect(StreamfeedManagerfeedmanager.activitycreated).toHaveBeenCalled();
	});

	it("calls activityDeleted feedManager the feedmanager after deletion", function() {
		var tweetId = Tweets.insert({
			text: 'text'
		});

		Tweets.remove(tweetId);

		expect(StreamfeedManagerfeedmanager.activitydeleted).toHaveBeenCalled();
	});

	it('only calls populate once', function() {
		var tweetId = Tweets.insert({
				text: 'test',
				link: linkId,
			}),
			tweet = Tweets.findOne(tweetId);

		spyOn(tweet, 'getLink');

		tweet.populate();
		tweet.populate();

		expect(tweet.getLink.calls.count()).toEqual(1);
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

	it('should follow model reference naming convention', function() {

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

	it('#createActivity().activityActor', function() {
		var tweetId = Tweets.insert({
			actor: userId
		});
		var tweet = Tweets.findOne(tweetId);
		var activity = tweet.createActivity();

		expect(activity.actor).toBe('users:' + userId);
	});
});
