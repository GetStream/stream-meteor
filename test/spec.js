describe("Stream.feeds", function() {
	it("#flat", function() {
		expect(Stream.feeds.flat instanceof Mongo.Collection).toBe(true);
	});
	it("#user", function() {
		expect(Stream.feeds.user instanceof Mongo.Collection).toBe(true);
	});
	it("#notification", function() {
		expect(Stream.feeds.notification instanceof Mongo.Collection).toBe(true);
	});
	it("#aggregated", function() {
		expect(Stream.feeds.aggregated instanceof Mongo.Collection).toBe(true);
	});
	it("#topic", function() {
		expect(Stream.feeds.topic instanceof Mongo.Collection).toBe(true);
	});
});

describe("Stream.feedManager", function() {
	beforeEach(function() {
		spyOn(Stream.feedManager.client, 'feed').and.returnValue({});
	});

	it("#getNewsFeeds", function() {
		var newsFeeds = Stream.feedManager.getNewsFeeds('some-id');

		expect(newsFeeds.flat).toBeDefined();
		expect(newsFeeds.aggregated).toBeDefined();
		expect(newsFeeds.topic).toBeDefined();
	});
});