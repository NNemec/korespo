/// <reference path="../typings/index.d.ts" />

import { ImapCache } from "./imapcache";

describe("PouchCache", () => {
  let imapClient: ImapCache;

  beforeEach(()=>{
    imapClient = new ImapCache("./testdb");
  })

  afterEach(()=>{
    imapClient.dbAccess().destroy();
  })

  it("can raw read/write", () => {
    return imapClient.store("someid",{hello:"world"})
    .then(()=>imapClient.retrieve("someid"))
    .then((doc)=>{ expect(doc.hello).toEqual("someid"); });
  });
});