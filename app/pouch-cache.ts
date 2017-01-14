import { Observable, BehaviorSubject } from 'rxjs';

declare const nodeRequire: (string)=>any;

// workaround: suppress warning for too many listeners on inaccessible levelChanges EventEmitter
// for discussion, see https://github.com/pouchdb/pouchdb/issues/6123
nodeRequire('events').defaultMaxListeners = 0;

const PouchDB = nodeRequire('pouchdb');
PouchDB.plugin(nodeRequire('pouchdb-find'));
PouchDB.plugin(nodeRequire('pouchdb-live-find'));
PouchDB.adapter('worker', nodeRequire('worker-pouch'));

const ElectronRemote = nodeRequire('electron').remote;

import deepEqual from 'deep-equal';

interface Document {
  _id: string;
}

export class PouchCache {
  private db: any;
  private _isOpen = false;
  private waitOpen: Promise<void>;

  isOpen(): boolean {
    return this._isOpen;
  }

  constructor(name: string) {
    this.db = new PouchDB(ElectronRemote.app.getPath('userData') + "/" + name,
//                          {adapter: 'worker'},
// crash on Chromium 53: https://github.com/nolanlawson/worker-pouch/issues/15
                          );
    this.waitOpen = this.db.info().catch((err)=>{
      console.error("failed to open PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(err));
      this.db.close();
      throw err;
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
    return this.waitOpen.then(()=>this.db.get(id));
  }

  observe(id: string, options?: {waitforcreation?: boolean}): Observable<Document> {
    return Observable.create((observer) => {
      let liveFeed: any;
      this.waitOpen
      .then(()=>{
        liveFeed = this.db.liveFind({
          selector: { _id: id },
          aggregate: true,
        });

        liveFeed
        .then((res)=>{
          console.log("initial query of " + id + " successful: " + res);
        },(err)=>{
          console.error("initial query of " + id + " failed:")
          observer.error(err);
        });

        liveFeed
        .on("update",(update,aggregate)=>{
          console.log("continuous query of " + id + " update: " + update);
          observer.next(aggregate[0]);
        })
        .on("cancelled",()=>{
          console.log("continuous query of " + id + " ended");
          observer.complete();
        })
        .on("error",(err)=>{
          console.error("continuous query of " + id + " failed");
          observer.error(err);
        });
      });

      // return unsubscribe handler
      return ()=>{ if(liveFeed) liveFeed.cancel(); }
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

  query_ids_by_prefix(prefix:string): Promise<any> {
    return this.waitOpen.then(()=>this.db.allDocs({
      startkey: prefix,
      endkey: prefix + '\uffff',
    }));
  }

  liveFeed_by_id_prefix(prefix:string): any {
    return this.db.liveFind({
      selector: { $and: [
        { _id: { $gte: prefix } },
        { _id: { $lte: prefix + '\uffff' } }
      ]},
      aggregate: true
    });
  }
}
