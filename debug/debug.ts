const PouchDB = require('pouchdb');
PouchDB.debug.enable('pouchdb:find')

import { ImapCache } from '../lib/imapcache';

import * as assert from 'assert';
import { pouchdb_store } from '../lib/util';

let imapCache = new ImapCache('debugdb');
let db = imapCache.dbAccess()

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
      for(let field of [ 'sender','from','to','reply-to','to','cc','bcc' ])
        if(doc.envelope[field])
          doc.envelope[field].forEach(addr => { emit([field,addr.address]); });
  }

  let ddoc = {
    _id: '_design/my_idx',
    views: {
      address: {
        map: mapAddr.toString(),
        reduce: '_count',
      },
    }
  };

  return pouchdb_store(db,ddoc).then((response)=>{
    console.log("query ddoc is " + response.stored
                                   ? "unchanged"
                                   : response.found
                                     ? "updated"
                                     : "created")
  }).then(()=>{
    return db.query("my_idx/address",{
      reduce: false,
    }).then(result => {
      assert.equal(result.total_rows,result.rows.length);
      console.log("#address entries found: "+result.rows.length);
    });
  }).then(()=>{
    return db.query("my_idx/address",{
      reduce: false,
      startkey: ["from"],
      endkey: ["from",{}],
    }).then(result => {
      assert(result.total_rows > result.rows.length);
      console.log("#from address entries found.: "+result.rows.length);
    });
  }).then(()=>{
    return db.query("my_idx/address",{
      reduce: false,
      startkey: ["to"],
      endkey: ["to",{}],
    }).then(result => {
      assert(result.total_rows > result.rows.length);
      console.log("#to address entries found.: "+result.rows.length);
    });
  }).then(()=>{
    return db.query("my_idx/address",{
      startkey: ["to"],
      endkey: ["to",{}],
      reduce: true,
      group: true,
    }).then(result => {
      console.log("#unique to addresses found: "+result.rows.length);
      console.log(result.rows.sort((a,b)=>(a.value-b.value)));
    });
  });

}).then(()=>{
  throw "success";

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
