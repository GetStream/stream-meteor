// Create a new namespace for this package

if (typeof Stream !== 'undefined') {
  throw new Meteor.Error('Namespace Stream is already in use by another package');
}

Stream = {};