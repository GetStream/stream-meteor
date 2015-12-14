Package.describe({
  name: 'getstream:stream-meteor',
  version: '0.3.5',
  summary: 'Getstream.io integration package for Meteor',
  git: 'https://github.com/GetStream/stream-meteor',
  documentation: 'README.md',
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use('ecmascript@0.1.6');
  api.use(['underscore', 'mongo']);
  api.use('matb33:collection-hooks@0.7.15');
  api.use('dburles:mongo-collection-instances@0.3.4');
  api.use('getstream:bin-deps@0.1.1');
  api.use('check@1.1.0');

  api.export('Stream');
  api.addFiles('src/namespace.js');
  api.addFiles('src/client/namespace.js', 'client');
  api.addFiles('src/server/namespace.js', 'server');
  api.addFiles(['config/getstream.js', 
                'stream-meteor.js',
                'src/feed-manager.js',
                'src/collections.js',
                'src/activity.js',
                'src/backend.js']);
  api.addFiles('src/server/publish.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('sanjo:jasmine@0.20.2');
  api.use(['underscore', 'mongo']);
  api.use('insecure');
  api.use('accounts-base');
  api.use('getstream:stream-meteor');

  api.addFiles('test/spec.js');
  api.addFiles('test/client/spec.js', ['client']);
  api.addFiles('test/server/spec.js', ['server']);
});
