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
    declare var emit:any;

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
    declare var emit:any;

    function mapAddr(doc) {
        if(doc._id.startsWith('envelope:'))
            for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                if(doc.envelope[f])
                    doc.envelope[f].forEach(addr => { emit(addr.address); });
    }

    let ddoc = {
        _id: '_design/my_idx',
        views: {
            address: {
                map: mapAddr.toString()
            }
        }
    };

    return pouchdb_store(db,ddoc._id,ddoc).then((response)=>{
        console.log("successfully stored query")
        console.log(response)
    }).then(()=>{
        return db.query("my_idx/address").then(result => {
            assert.equal(result.total_rows,result.rows.length);
            console.log("#addresses found in persitent query: "+result.total_rows);
        });
    });


}).then(()=>{
    return Promise.resolve().then(()=>{
        return db.createIndex({
            index: {
                fields:["envelope.subject"],
            }
        }).then(result=>{
            console.log("index created:");
            console.log(result);
            return db.getIndexes();
        }).then(idxs=>{
            console.log(idxs);
        })

    }).then(()=>{
        return db.find({
            selector: {
                'envelope.subject': { $gt: "" }
            },
            fields: ['envelope.subject'],
        }).then(found=>{
            console.log(found)
        })
    })

}).then(()=>{
    return Promise.resolve().then(()=>{

        declare var emit:any;
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
