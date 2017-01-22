/// <reference path="../typings/index.d.ts" />

import { ImapClient } from "./imapclient";

describe("PouchCache", () => {
    let imapClient: ImapClient;

    beforeEach(()=>{
        imapClient = new ImapClient("./testdb");
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