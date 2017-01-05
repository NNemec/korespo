declare const NodePouchDB: any;
declare const ElectronRemote: any;
declare const deepEqual: any;

export class PouchCache {
  db: any;
  observed = new Map<string,any>();

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
  }

  onChange(id: string): void {
    if(this.observed.has(id)) {
      console.info("PouchCache onChange - updating: ",id);
      this.db.get(id).then((doc) => {
        Object.assign(this.observed.get(id), doc);
      });
    } else {
      console.info("PouchCache onChange - ignoring: ",id);
    }
  }

  retrieve(id: string, options: any): Promise<any> {
    if(this.observed.has(id)) {
      return Promise.resolve(this.observed.get(id));
    } else {
      return this.db.get(id).catch((err) => {
        if(options.default) {
          return options.default;
        } else {
          throw err;
        }
      }).then((doc) => {
        if(options.observe) {
          this.observed.set(id,doc);
        }
        return doc;
      });
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
