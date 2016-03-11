describe('Stream.feedManager', function() {
	it('is defined', function() {
		expect(Stream.feedManager).toBeDefined();
	});

	it('#getFlatFeed()', function() {
		expect(typeof Stream.feedManager.getUserFeed).toEqual('function');
	})

	it('#getNewsFeeds()', function() {
		expect(typeof Stream.feedManager.getNewsFeeds).toEqual('function');
	});

	it('#getNotificationFeed()', function() {
		expect(typeof Stream.feedManager.getNotificationFeed).toEqual('function');
	});

	it("#getNotificationFeedStats", function() {
		expect(typeof Stream.feedManager.getNotificationFeedStats).toEqual('function');
	});
});

describe('Stream.backend', function() {
	var backend = new Stream.Backend;

	it('is defined', function() {
		expect(backend).toBeDefined();
	});

	it('#enrichActivities()', function() {
		expect(typeof backend.enrichActivities).toEqual('function');
	});

	it('#enrichAggregatedActivities()', function() {
		expect(typeof backend.enrichAggregatedActivities).toEqual('function');
	});
});