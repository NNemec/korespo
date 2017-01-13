import { Observable, BehaviorSubject } from 'rxjs/Rx';

declare const PouchDB: any;
declare const ElectronRemote: any;

import deepEqual from 'deep-equal';

interface Document {
  _id: string;
}

export class PouchCache {
  db: any;

  isOpen(): boolean {
    return this.db;
  }

  constructor(name: string) {
    this.open(name);
  }

  open(name: string): Promise<void> {
    this.db = new PouchDB(ElectronRemote.app.getPath('userData') + "/" + name);
    return this.db.info().catch((err)=>{
      console.error("failed to open PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(err));
      this.db.close();
      throw err;
    }).then((info)=>{
      console.info("successfully opened PouchDB: " + name);
    });
  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  retrieve(id: string): Promise<any> {
    return this.db.get(id);
  }

  observe(id: string, options?: {waitforcreation?: boolean}): Observable<Document> {
    return Observable.create((observer) => {
      this.db.get(id).catch((err)=>{
        if(options && options.waitforcreation && err.name == "not_found") {          
          // if it does not yet exist, observe anyway
        } else
          observer.error(err);
      }).then((doc)=>{
        observer.next(doc);
      });

      let eventemitter = this.db.changes({
        doc_ids:[id],
        since: 'now',
        live: true,
        include_docs:true,
      }).on('change',(info)=>{
        observer.next(info.doc);
      }).on('complete',(info)=>{
        observer.complete();
      }).on('error',(err)=>{
        observer.error(err);
      });

      // return unsubscribe handler
      return ()=>{ eventemitter.cancel(); }
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
    return this.db.allDocs({
      startkey: prefix,
      endkey: prefix + '\uffff',
    });
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
