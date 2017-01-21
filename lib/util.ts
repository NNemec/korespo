import { Observable } from 'rxjs';

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-live-find'));

// workaround: suppress warning for too many listeners on inaccessible levelChanges EventEmitter
// for discussion, see https://github.com/pouchdb/pouchdb/issues/6123
require('events').defaultMaxListeners = 0;

import deepEqual from 'deep-equal';

export function pouchdb_observe(db: any, request: any): Observable<any[]> {
  return Observable.create((observer) => {
    let liveFeed = db.liveFind(request);
    let non_ready_aggregate = []
    let ready: false

    liveFeed
    .then((res)=>{
//        console.log("initial query of " + request + " successful: " + res);
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

export function pouchdb_store(db: any, id: string, newdoc: any): Promise<any> {
  newdoc._id = id;
  let store = false;
  return db.get(id).then((olddoc)=>{
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
      return db.put(newdoc);
    }
  });
};
