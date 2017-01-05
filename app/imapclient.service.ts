import { Injectable, OnInit } from '@angular/core';

import { PouchCache } from './pouch-cache';

declare const ImapClient: any;

export class AccountData {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
}

@Injectable()
export class ImapClientService implements OnInit {
  cache = new PouchCache;
  accountData = new AccountData;
  imapClient: any;
  mailboxes: any = { root: true, children: [] };

  isOpen(): boolean {
    return this.cache.isOpen();
  }

  ngOnInit() {
    return this.cache.open("imapcache").catch((err)=>{
      throw err;
    }).then(()=>{
      this.cache.retrieve("account").then((doc) => {
        this.accountData = doc;
      });
      this.cache.observe("mailboxes").subscribe((doc)=>{
        this.mailboxes = doc;
      });
    })
  }

  close(): void {
    this.cache.close();
  }

  isLoggedIn(): boolean {
    return this.imapClient && this.mailboxes && this.cache.isOpen();
  }

  login(): Promise<any> {
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

    return this.imapClient.connect().catch((err)=>{
      console.error("login failed");
      this.logout();
      throw err;
    }).then(()=>{
      console.info("logged in");
      this.cache.store("account",this.accountData);
    });
  }

  logout(): void {
    if(this.imapClient) {
      this.imapClient.close();
      this.imapClient = undefined;    
    }
    this.mailboxes = undefined;
  }

  updateMailboxes(): Promise<any> {
    return this.imapClient.listMailboxes().then((mailboxes)=>{
      return this.cache.store("mailboxes", mailboxes);
    });
  }

  updateMailbox(path: string): void {
    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      return this.cache.store("mailbox:"+path, mailbox);
    }).then(()=>{
      let p_imapmsgs = this.imapClient.listMessages(path,"1:*",['uid']);
      let p_cachemsgs = this.cache.query_ids_by_prefix("envelope:"+path+":");
      return Promise.all([p_imapmsgs,p_cachemsgs]);
    }).then(([imapmsgs,cachemsgs])=>{
      let imapuids = new Set(imapmsgs.map(({uid})=>uid));
      let cacheuids = new Set(cachemsgs.rows.map(({id})=>Number(id.split(':').pop())));
      let to_delete = Array.from(cacheuids).filter(uid=>!imapuids.has(uid));
      let to_create = Array.from(imapuids).filter(uid=>!cacheuids.has(uid));

      // handle to_delete here

      return  to_create.length == 0 ? []
          : this.imapClient.listMessages(path,to_create.join(','),['uid','flags','envelope'],{byUid:true});

    }).then((new_messages)=>{
      for(let message of new_messages) {
        delete message["#"];
        message._id = "envelope:"+path+":"+message.uid;
      }

      // console.log("storing messages: " + JSON.stringify(new_messages,null,'\t'));

      return this.cache.db.bulkDocs(new_messages);
    }).then(()=>{
      return this.cache.query_ids_by_prefix("envelope:"+path+":");
    }).then((messages)=>{
      // console.log("retrieved messages: " + JSON.stringify(messages,null,'\t'));
    });
  }

  updateAll(): void {
    this.updateMailboxes().then(()=>{
      let updateRecursively = ((children:any[])=>{
        for(let child of children) {
          this.updateMailbox(child.path);
          updateRecursively(child.children);
        }
      })
      updateRecursively(this.mailboxes.children);
    });
  }
}
