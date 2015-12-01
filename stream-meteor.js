var apiKey = Meteor.settings.public.streamApiKey,
    apiAppId = Meteor.settings.public.streamApiAppId;

var settings = _.clone(Config);

settings['apiKey'] = apiKey;
settings['apiAppId'] = apiAppId;

if (Meteor.isServer) {
  Stream.stream = Npm.require('getstream');

  settings['apiSecret'] = Meteor.settings.streamApiSecret;
}

Stream.feedManager = new FeedManager(settings);