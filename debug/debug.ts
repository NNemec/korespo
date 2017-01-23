console.log("something")

import { ImapClient } from '../lib/imapclient';

let imapClient = new ImapClient('debugdb');

imapClient.dbAccess().info().then((info)=>{
    console.log(info);
}).catch((err)=>{
    console.error(err);
})

