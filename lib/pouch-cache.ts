import { Observable } from 'rxjs';

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

import { remote as ElectronRemote } from 'electron';

import { pouchdb_observe, pouchdb_store } from './util';

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

  observe(id: string): Observable<any> {
    return pouchdb_observe(this.db,{
      selector: { _id: id },
      aggregate: true,
    }).filter(v=>v.length==1).map(v=>v[0]);
  }

  observe_by_prefix(prefix:string): Observable<any[]> {
    return pouchdb_observe(this.db,{
      selector: { $and: [
        { _id: { $gte: prefix } },
        { _id: { $lte: prefix + '\uffff' } }
      ]},
      aggregate: true
    });
  }

  store(id: string,newdoc: any): Promise<any> {
    return pouchdb_store(this.db, id, newdoc);
  }

  store_bulk(newdocs: any[]): Promise<any> {
    return this.db.bulkDocs(newdocs);
  }
}
