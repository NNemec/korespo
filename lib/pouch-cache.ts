import { Observable, BehaviorSubject } from 'rxjs';

// workaround: suppress warning for too many listeners on inaccessible levelChanges EventEmitter
// for discussion, see https://github.com/pouchdb/pouchdb/issues/6123
require('events').defaultMaxListeners = 0;

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-live-find'));

const ElectronRemote = require('electron').remote;

import deepEqual from 'deep-equal';

interface Document {
  _id: string;
}

export class PouchCache {
  private db: any;
  private _isOpen = false;

  isOpen(): boolean {
    return this._isOpen;
  }

  constructor(name: string) {
    let path = ElectronRemote ? ElectronRemote.app.getPath('userData') : '.';
    this.db = new PouchDB(path + "/" + name);
    this.db.info().catch((err)=>{
      console.error("failed to open PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(err));
      this.db.close();
    }).then((info)=>{
      console.info("successfully opened PouchDB: " + name);
      this._isOpen = true;
    });
  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
      this._isOpen = false;
    }
  }

  retrieve(id: string): Promise<any> {
    return this.db.get(id);
  }

  retrieve_by_prefix(prefix:string): Promise<any[]> {
    return this.db.find({
      selector: { $and: [
        { _id: { $gte: prefix } },
        { _id: { $lte: prefix + '\uffff' } }
      ]},
    }).then((result:{docs:any[]})=>result.docs);
  }

  private _observe(request: any): Observable<Document[]> {
    return Observable.create((observer) => {
      let liveFeed = this.db.liveFind(request);
      let non_ready_aggregate = []
      let ready: false

      liveFeed
      .then((res)=>{
//          console.log("initial query of " + request + " successful: " + res);
      },(err)=>{
        console.error("initial query of " + request + " failed:")
        observer.error(err);
      });

      liveFeed
      .on("update",(update,aggregate)=>{
//          console.log("continuous query of " + request + " update: " + update);
        if(non_ready_aggregate)
          non_ready_aggregate = aggregate
        else
          observer.next(aggregate);
      })
      .on("ready",()=>{
        observer.next(non_ready_aggregate);
        non_ready_aggregate = undefined
      })
      .on("cancelled",()=>{
//          console.log("continuous query of " + request + " ended");
        observer.complete();
      })
      .on("error",(err)=>{
        console.error("continuous query of " + request + " failed");
        observer.error(err);
      });

      // return unsubscribe handler
      return ()=>{ if(liveFeed) liveFeed.cancel(); }
    });
  }

  observe(id: string): Observable<Document> {
    return this._observe({
      selector: { _id: id },
      aggregate: true,
    }).filter(v=>v.length==1).map(v=>v[0]);
  }

  observe_by_prefix(prefix:string): Observable<Document[]> {
    return this._observe({
      selector: { $and: [
        { _id: { $gte: prefix } },
        { _id: { $lte: prefix + '\uffff' } }
      ]},
      aggregate: true
    });
  }

  store(id: string,newdoc: any): Promise<any> {
    newdoc._id = id;
    let store = false;
    return this.db.get(id).then((olddoc)=>{
      newdoc._rev = olddoc._rev;
      if(deepEqual(olddoc,newdoc)) {
        console.info("previous data (unchanged): " + id); // + JSON.stringify(olddoc));
        return {
          "ok": true,
          "id": id,
          "rev": olddoc._rev,
        };
      } else {
        console.info("found previous data: " + id); // + JSON.stringify(olddoc));
        store = true;
      }
    }).catch((err)=>{
      console.info("no previous data found.");
      store = true;
    }).then(()=>{
      if(store) {
        console.info("storing new data: " + id); // + JSON.stringify(newdoc));
        return this.db.put(newdoc);
      }
    });
  }

  store_bulk(newdocs: any[]): Promise<any> {
    return this.db.bulkDocs(newdocs);
  }
}
