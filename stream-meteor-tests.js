// Write your tests here!
// Here is an example.
Tinytest.add('StreamBackend', function(test) {
  
	var backend = new StreamBackend();

	test.isNotUndefined(backend, 'collectReferences', 'should have the right properties');
	test.isNotUndefined(backend, 'enrichActivities', 'should have the right properties');
	test.isNotUndefined(backend, 'enrichAggregatedActivities', 'should have the right properties');
});
