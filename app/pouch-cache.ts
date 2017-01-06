import { Observable, BehaviorSubject } from 'rxjs/Rx';

declare const NodePouchDB: any;
declare const ElectronRemote: any;
declare const deepEqual: any;

interface Document {
  _id: string;
}

export class PouchCache {
  db: any;

  isOpen(): boolean {
    return this.db;
  }

  open(name: string): Promise<void> {
    let db = new NodePouchDB(ElectronRemote.app.getPath('userData') + "/" + name);
    return db.info().catch((err)=>{
      console.error("failed to open PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(err));
      db.close();
      throw err;
    }).then((info)=>{
      console.info("opened PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(info));
      this.db = db;
      this.db.changes({
        since: 'now',
        live: true,
      }).on('change', (change) => {
        this.onChange(change.id);
      }).on('complete', (info) => {
        console.info("PouchCache: changes() was cancelled:",JSON.stringify(info));
      }).on('error', function (err) {
        console.error("PouchCache onChangeError:",err);
      });
    });
  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
    }
    this.observed.forEach((subject,id)=>{subject.complete()});
    this.observed.clear();
  }

  retrieve(id: string): Promise<any> {
    return this.db.get(id);
  }

  private observed = new Map<string,BehaviorSubject<Document>>();

  observe(id: string): Observable<Document> {
    if(!this.observed.has(id)) {
      this.observed.set(id, new BehaviorSubject({_id: ""}));

      this.retrieve(id).then((doc)=>{
        this.observed.get(id).next(doc);
      }).catch((err)=>{
//        this.observed.get(id).error(`error observing '${id}': ` + err);
      });
    }
    return this.observed.get(id).filter(doc => doc._id == id);
  }

  private onChange(id: string): void {
    if(this.observed.has(id)) {
//      if(!this.observed.get(id).hasObservers()) {  // not yet implemented in rxjs 5.0.3
      if(this.observed.get(id).observers.length == 0) { // will break
        this.observed.delete(id);
        console.info("PouchCache onChange - dropping: ",id);
      }
      console.info("PouchCache onChange - updating: ",id);
      this.db.get(id).then((doc) => {
        this.observed.get(id).next(doc);
      }).catch((err)=>{
        this.observed.get(id).error(`in change notification for '${id}': ` + err);
      });
    } else {
      console.info("PouchCache onChange - ignoring: ",id);
    }
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
  };
}
