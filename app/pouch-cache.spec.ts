/// <reference path="../typings/index.d.ts" />

import { PouchCache } from "./pouch-cache";

describe("PouchCache", () => {
    it("can be opened", () => {
        let pouch_cache = new PouchCache("testdb");

        return pouch_cache.store("someid",{hello:"world"})
        .then(()=>pouch_cache.retrieve("someid"))
        .then((doc)=>{ expect(doc.hello).toEqual("someid"); });
    });
});