const PouchDB = require('pouchdb');
PouchDB.debug.enable('pouchdb:find')

import { ImapClient } from '../lib/imapclient';

let imapClient = new ImapClient('debugdb');
let db = imapClient.dbAccess()

Promise.resolve().then(()=>{
    return Promise.resolve().then(()=>{
        return db.getIndexes()
    }).then((idxs)=>{
        for(let idx of idxs.indexes) {
            if(idx.name != '_all_docs') {
                console.log("deleting index:" + idx.name)
                db.deleteIndex(idx)
            }
        }
    }).then(()=>{
        return db.getIndexes();
    }).then((idxs)=>{
        console.log("idxs after deleting: ");
        console.log(idxs);
    });
}).then(()=>{

    declare var emit:any;

    db.query(function (doc) {
        if(doc._id.startsWith('envelope:'))
            for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                if(doc.envelope[f])
                    doc.envelope[f].forEach(addr => { emit(addr.address); });
    }, {}).then(function (result) {
        console.log(result);
    });

}).then(()=>{
/*
    declare var emit:any;

    function mapAddr(doc) {
        if(doc._id.startsWith('envelope:'))
            for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                if(doc.envelope[f])
                    doc.envelope[f].forEach(addr => { emit(addr.address); });
    }

    let ddoc = {
        _id: '_design/address',
        views: {
            address: {
                map: mapAddr.toString()
            }
        }
    };

    db.query(function (doc) {
        if(doc._id.startsWith('envelope:'))
            for(let f of [ 'sender','from','to','reply-to','to','cc','bcc' ])
                if(doc.envelope[f])
                    doc.envelope[f].forEach(addr => { emit(addr.address); });
    }, {}).then(function (result) {
        console.log(result);
    });
*/
}).then(()=>{
/*
    return Promise.resolve().then(()=>{

        return db.createIndex({
            index: {
                fields:["envelope.subject"],
            }
        })
    })
    .then(result=>{
        console.log("index created:");
        console.log(result);
        return db.getIndexes();
    })
    .then(idxs=>{
        console.log(idxs);
    })
    .then(()=>{
        return db.find({
            selector: {
                'envelope.subject': { $gt: "" }
            },
            fields: ['envelope.subject'],
        })
    })
    .then(found=>{
        console.log(found)
    })
*/
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
//                fields:["envelope.subject"],
        //    name:"address",
        //    name:"subject",
            }
        })
    })
    .then(result=>{
        console.log("index created:");
        console.log(result);
        return db.getIndexes();
    //    return db.get(result.id);
    })
    .then(idxs=>{
        console.log(idxs);
        Promise.all(
            idxs.indexes
            .filter(idx=>(!!idx.ddoc))
            .map(idx=>(db.get(idx.ddoc).then(doc=>{
                        console.log("ddoc.views:")
                        console.log(doc.views)
                    })))
        );

    //    console.log(doc.views['subject']);
    //    console.log(doc.views['address']);
    })
    .then(()=>{
        return db.find({
            selector: {
                'address': { $gt: "" }
    //            'envelope.subject': { $gt: "Ubuntu" }
            },
//            fields: ['address'],
        })
    })
    .then(found=>{
        console.log(found.docs)
    })

})