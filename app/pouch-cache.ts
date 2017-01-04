declare const NodePouchDB: any;
declare const ElectronRemote: any;
declare const deepEqual: any;

export class PouchCache {
  db: any;

  open(name: string): Promise<void> {
    this.db = new NodePouchDB(ElectronRemote.app.getPath('userData') + "/" + name);
    return this.db.info().then((info)=>{
      console.info("opened PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(info));
    }).catch((err)=>{
      console.error("failed to open PouchDB: " + name);
      console.debug("PouchDB info: " + JSON.stringify(err));
      this.db.close();
      this.db = undefined;
      throw err;
    });
  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  store(id: string,newdoc: any): Promise<any> {
    newdoc._id = id;
    let store = false;
    return this.db.get(id).then((olddoc)=>{
      newdoc._rev = olddoc._rev;
      if(deepEqual(olddoc,newdoc)) {
        console.info("previous data (unchanged): " + JSON.stringify(olddoc));
        return {
          "ok": true,
          "id": id,
          "rev": olddoc._rev,
        };
      } else {
        console.info("found previous data: " + JSON.stringify(olddoc));
        store = true;
      }
    }).catch((err)=>{
      console.info("no previous data found.");
      store = true;
    }).then((doc)=>{
      if(store) {
        console.info("storing new data: " + JSON.stringify(newdoc));
        return this.db.put(newdoc);
      }
    });
  }
}
