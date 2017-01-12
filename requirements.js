// no idea why I have to put these requirements in this global location,
// but it is the only way I could get it work...

const ImapClient = require('emailjs-imap-client');
const deepEqual = require('deep-equal');

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-live-find'));

const ElectronRemote = require('electron').remote;

// workaround: suppress warning for too many listeners on inaccessible levelChanges EventEmitter
// for discussion, see https://github.com/pouchdb/pouchdb/issues/6123
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 0;