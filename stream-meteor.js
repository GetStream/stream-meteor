// Create a new namespace for this package

if (typeof Stream !== 'undefined') {
  throw new Meteor.Error('Namespace Stream is already in use by another package');
}

Stream = {};

if (Meteor.isServer) {
  var stream = Npm.require('stream-node');

  var apiKey = Meteor.settings.public.streamApiKey,
      apiAppId = Meteor.settings.public.streamApiAppId,
      apiSecret = Meteor.settings.streamApiSecret;

  var STREAM_CONFIG = {
    apiKey,
    apiSecret,
    apiAppId,
  };

  FeedManager = stream.feedManagerFactory(STREAM_CONFIG);
  Stream.FeedManager = FeedManager;
}
