var apiKey = Meteor.settings.public.streamApiKey,
    apiAppId = Meteor.settings.public.streamApiAppId;

var settings = _.clone(Config);

if(! apiKey) {
  throw new Meteor.Error('misconfig', 'No getstream.io app api key found in your settings.json\n hint: Are you running meteor with --settings settings.json?'); 
}

if(! apiAppId) {
  throw new Meteor.Error('misconfig', 'No getstream.io app id key found in your settings.json\n hint: Are you running meteor with --settings settings.json?'); 
}

settings['apiKey'] = apiKey;
settings['apiAppId'] = apiAppId;

if (Meteor.isServer) {
  if(! Meteor.settings.streamApiSecret) {
    throw new Meteor.Error('misconfig', 'No getstream.io private key found in your settings.json\n hint: Are you running meteor with --settings settings.json?');
  }
  settings['apiSecret'] = Meteor.settings.streamApiSecret;
}

if(Meteor.settings.public.userFeed) {
  settings['userFeed'] = Meteor.settings.public.userFeed;
}

if(Meteor.settings.userFeed) {
  settings['userFeed'] = Meteor.settings.userFeed;
}

if(Meteor.settings.public.notificationFeed) {
  settings['notificationFeed'] = Meteor.settings.public.notificationFeed;
}

if(Meteor.settings.notificationFeed) {
  settings['notificationFeed'] = Meteor.settings.notificationFeed;
}

if(Meteor.settings.public.newsFeeds) {
  settings['newsFeeds'] = Meteor.settings.public.newsFeeds;
}

if(Meteor.settings.newsFeeds) {
  settings['newsFeeds'] = Meteor.settings.newsFeeds;
}

Stream._settings = settings;