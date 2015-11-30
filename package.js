Package.describe({
  name: 'getstream:stream-meteor',
  version: '0.1.0',
  summary: 'Getstream.io integration package for Meteor',
  git: 'https://github.com/GetStream/stream-meteor',
  documentation: 'README.md',
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use(['underscore', 'mongo']);
  api.use('matb33:collection-hooks');
  api.use('dburles:mongo-collection-instances');

  api.export('Stream');
  api.addFiles(['stream-meteor.js',
                'src/collections.js',
                'src/activity.js',
                'src/backend.js',]);
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('sanjo:jasmine@0.20.2');
  // api.use('velocity:html-reporter');
  api.use(['underscore', 'mongo']);
  api.use('insecure');
  api.use('accounts-base');
  api.use('getstream:stream-meteor');

  api.addFiles('test/client/spec.js', ['client']);
  api.addFiles('test/server/spec.js', ['server']);
  api.addFiles('test/spec.js');
});

Npm.depends({
  "getstream-node": "1.0.0",
});
