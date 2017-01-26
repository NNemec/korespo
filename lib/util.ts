import { Observable } from 'rxjs';

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-live-find'));

// workaround: suppress warning for too many listeners on inaccessible levelChanges EventEmitter
// for discussion, see https://github.com/pouchdb/pouchdb/issues/6123
require('events').defaultMaxListeners = 0;

import * as deepEqual from 'deep-equal';

export function promiseLoop<T>(list: T[],action: (T)=>Promise<void>): Promise<void> {
  return (list.length === 0)
          ? Promise.resolve()
          : action(list[0]).then(()=>promiseLoop(list.slice(1),action));
}

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

export function pouchdb_store(db: any, newdoc: {_id:string,_rev?:string}): Promise<{found:boolean,stored:boolean}> {
  let id = newdoc._id;
  let found = false;
  let store = true;
  return db.get(id).then((olddoc)=>{
    found = true;
    newdoc._rev = olddoc._rev;
    if(deepEqual(olddoc,newdoc)) {
      store = false;
    }
  }).catch((err)=>{
    if(err.status !== 404) {
      throw err;
    }
  }).then(()=>{
    if(store) {
      return db.put(newdoc).then((result)=>{
        newdoc._rev = result.rev;
      });
    }
  }).then(()=>{
    return {
      found: found,
      stored: store,
    };
  });
};
