const PouchDB = require('pouchdb');
PouchDB.debug.enable('pouchdb:find')

import { ImapClient } from '../lib/imapclient';

import * as assert from 'assert';
import { pouchdb_store } from '../lib/util';

let imapClient = new ImapClient('debugdb');
let db = imapClient.dbAccess()

Promise.resolve().then(()=>{
    return Promise.resolve().then(()=>{
        return db.getIndexes().then((idxs)=>{
            return Promise.all(
                idxs.indexes
                .filter(idx => idx.name != '_all_docs')
                .map(idx => {
                    console.log("deleting index:" + idx.name)
                    return db.deleteIndex(idx)
                })
            );
        });
    }).then(()=>{
        return db.getIndexes().then((idxs)=>{
            assert.equal(idxs.indexes.length, 1)
        });
    });

}).then(()=>{
    console.log("==== Temporary queries ====")

    var emit:any;

    return db.query(doc => {
        if(doc._id.startsWith('envelope:'))
            for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                if(doc.envelope[f])
                    doc.envelope[f].forEach(addr => { emit(addr.address); });
    }, {}).then(function (result) {
        assert.equal(result.total_rows,result.rows.length);
        console.log("#addresses found in query: "+result.total_rows);
    });

}).then(()=>{
    console.log("==== Persistent Map/Reduce queries ====")

    var emit:any;

    function mapAddr(doc) {
        if(doc._id.startsWith('envelope:'))
            for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                if(doc.envelope[f])
                    doc.envelope[f].forEach(addr => { emit(addr.address); });
    }

    let ddoc = {
        _id: '_design/my_idx',
        views: {
            address_list: {
                map: mapAddr.toString(),
            },
            address_count: {
                map: mapAddr.toString(),
                reduce: '_count',
            },
        }
    };

    return pouchdb_store(db,ddoc._id,ddoc).then((response)=>{
        console.log("query is stored")
        console.log(response)
    }).then(()=>{
        return db.query("my_idx/address_list").then(result => {
            assert.equal(result.total_rows,result.rows.length);
            console.log("#address entries found: "+result.rows.length);
        });
    }).then(()=>{
        return db.query("my_idx/address_list",{
            startkey: "Norbert",
            endkey: "Norbert\uffff",
        }).then(result => {
            assert(result.total_rows > result.rows.length);
            console.log("#address entries 'Norbert...' found.: "+result.rows.length);
        });
    }).then(()=>{
        return db.query("my_idx/address_count",{
            reduce: true,
            group: true,
        }).then(result => {
            console.log("#grouped addresses found: "+result.rows.length);
        });
    });

}).then(()=>{
    console.log("==== createIndex / find ====")

    return Promise.resolve().then(()=>{
        return db.createIndex({
            index: {
                fields:["envelope.subject"],
            }
        }).then(result=>{
            console.log("index created");
            return db.getIndexes();
        }).then(idxs=>{
            assert(idxs.indexes.some(idx=>idx.def.fields[0]["envelope.subject"]))
        })

    }).then(()=>{
        return db.find({
            selector: {
                'envelope.subject': { $gt: "" }
            },
            fields: ['envelope.subject'],
        }).then(found=>{
            console.log("#docs found: " + found.docs.length)
        })
    })

}).then(()=>{
    throw "success";

}).then(()=>{
    console.log("==== find with Computed index ====")

    return Promise.resolve().then(()=>{

        var emit:any;
        function mapAddr(doc) {
            if(doc._id.startsWith('envelope:'))
                for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                    if(doc.envelope[f])
                        doc.envelope[f].forEach(addr => { emit(addr.address); });
        }
        return db.createIndex({
            index: {
              fields:[{"address":mapAddr.toString()}],
            }
        }).then(result=>{
            console.log("index created:");
            console.log(result);
        })

    }).then(()=>{
        return db.getIndexes().then(idxs=>{
            console.log(idxs);
            Promise.all(
                idxs.indexes
                .filter(idx=>(!!idx.ddoc))
                .map(idx=>(db.get(idx.ddoc).then(doc=>{
                            console.log("ddoc.views:")
                            console.log(doc.views)
                        })))
            );
        });

    }).then(()=>{
        return db.find({
            selector: { address: { $gt: "Norbert" } },
/*
            selector: { $and: [
                { 'address': { $gte: "Norbert" },
                { 'address': { $lte: "Norbert\uFFFF" },
                ]}
    //            'envelope.subject': { $gt: "Ubuntu" }
            },
*/
//            fields: ['subject'],
        }).then(found=>{
            console.log("found: ")
            console.log(found.docs)
        })
    })
}).catch(err=>{
    console.error(err)
})
