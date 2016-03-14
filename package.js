Package.describe({
  name: 'GetStream:stream-meteor',
  version: '0.4.0',
  summary: 'Getstream.io integration package for Meteor',
  git: 'https://github.com/GetStream/stream-meteor',
  documentation: 'README.md',
});

Npm.depends({
  'getstream': '3.1.2',
  'fibers': '1.0.8',
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use('ecmascript@0.1.6');
  api.use(['cosmos:browserify@0.10.0'], 'client');
  api.use(['underscore', 'mongo']);
  api.use('matb33:collection-hooks@0.7.15');
  api.use('dburles:mongo-collection-instances@0.3.4');
  api.use('check@1.1.0');

  api.export('Stream');
  api.addFiles('src/namespace.js');
  api.addFiles('src/client.browserify.js', 'client');
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
  api.use('GetStream:stream-meteor');

  api.addFiles('test/spec.js');
  api.addFiles('test/client/spec.js', ['client']);
  api.addFiles('test/server/spec.js', ['server']);
});
