declare const NodePouchDB: any;
declare const ElectronRemote: any;

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
    return this.db.get(id).then((olddoc)=>{
      console.info("found previous data: " + JSON.stringify(olddoc));
      newdoc._rev = olddoc._rev;
    }).catch((err)=>{
      console.info("no previous data found.");
    }).then((doc)=>{
      console.info("storing new data: " + JSON.stringify(newdoc));
      return this.db.put(newdoc);
    });
  }
}
