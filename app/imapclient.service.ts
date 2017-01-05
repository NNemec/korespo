import { Injectable } from '@angular/core';

import { PouchCache } from './pouch-cache';

declare const ImapClient: any;
declare const ElectronStorage: any;

export class AccountData {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
}

@Injectable()
export class ImapClientService {
  accountData: AccountData;
  imapClient: any;
  mailboxes: any;
  cache: PouchCache;
  selectedPath: string;

  constructor() {
    this.accountData = new AccountData;
    ElectronStorage.get('AccountData').then(data=>{
      this.accountData = data;
    });
    this.cache = new PouchCache();
  }

  isLoggedIn(): boolean {
    return this.imapClient && this.mailboxes && this.cache.isOpen();
  }

  login(): void {
    this.imapClient = new ImapClient(
      this.accountData.host,
      this.accountData.port,
      {
        auth: {
          user: this.accountData.user,
          pass: this.accountData.pass,
        },
        requireTLS: true,
      });

    this.imapClient.logLevel = ImapClient.LOG_LEVEL_INFO;

    this.imapClient.connect().catch((err)=>{
      console.error("login failed");
      this.logout();
      throw err;
    }).then(()=>{
      console.info("logged in");
      ElectronStorage.set('AccountData', this.accountData);
      let cacheName = "imapcache:"+this.accountData.user+"@"+this.accountData.host+":"+this.accountData.port;
      this.cache.open(cacheName).catch((err)=>{
        this.logout();
        throw err;
      }).then(()=>{
        this.cache.retrieve("mailboxes",{
          observe: true,
          default: { root: true, children: []},
        }).then((mailboxes) => {
          this.mailboxes = mailboxes;
        });
        this.updateMailboxes();
      });
    });
  }

  logout(): void {
    if(this.imapClient) {
      this.imapClient.close();
      this.imapClient = undefined;    
    }
    this.cache.close();
    this.mailboxes = undefined;
    this.selectedPath = undefined;
  }

  updateMailboxes(): void {
    this.selectedPath = undefined;
    this.imapClient.listMailboxes().then((mailboxes)=>{
      return this.cache.store("mailboxes", mailboxes);
    }).then(()=>{
/*
      let updateRecursively = ((children:any[])=>{
        for(let child of children) {
          this.select(child.path);
          updateRecursively(child.children);
        }
      })
      updateRecursively(this.mailboxes.children)
*/
    });
  }

  select(path: string): void {
    this.selectedPath = path;
    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      return this.cache.store("mailbox:"+path, mailbox);
    }).then(()=>{
      let p_imapmsgs = this.imapClient.listMessages(path,"1:*",['uid']);
      let p_cachemsgs = this.cache.query_ids_by_prefix("message:"+path+":");
      return Promise.all([p_imapmsgs,p_cachemsgs]);
    }).then(([imapmsgs,cachemsgs])=>{
      let imapuids = new Set(imapmsgs.map(({uid})=>uid));
      let cacheuids = new Set(cachemsgs.rows.map(({id})=>Number(id.split(':').pop())));
      let to_delete = Array.from(cacheuids).filter(uid=>!imapuids.has(uid));
      let to_create = Array.from(imapuids).filter(uid=>!cacheuids.has(uid));

      // console.log(imapuids);
      // console.log(cacheuids);
      // console.log(to_delete);
      // console.log(to_create);

      // handle to_delete here

      return  to_create.length == 0 ? []
          : this.imapClient.listMessages(path,to_create.join(','),['uid','flags','envelope'],{byUid:true});

    }).then((new_messages)=>{
      for(let message of new_messages) {
        delete message["#"];
        message._id = "message:"+path+":"+message.uid;
      }

      // console.log("storing messages: " + JSON.stringify(new_messages,null,'\t'));

      return this.cache.db.bulkDocs(new_messages);
    }).then(()=>{
      return this.cache.query_ids_by_prefix("message:"+path+":");
    }).then((messages)=>{
      // console.log("retrieved messages: " + JSON.stringify(messages,null,'\t'));
    });
  }
}
