import { Observable } from 'rxjs';

import { PouchCache } from './pouch-cache';

export class AccountData {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
}

export class ImapClient {
  private cache: PouchCache;
  private imapClient: any;
  private _accountData = new AccountData;

  accountData(): AccountData {
    return this._accountData;
  }

  constructor() {
    this.cache = new PouchCache("imapcache");

    this.cache.retrieve("account").then((doc) => {
      this._accountData = doc;
    }).catch(()=>{
    });
  }

  isOpen(): boolean {
    return this.cache.isOpen();
  }

  close(): void {
    this.cache.close();
  }

  observe_mailboxes(): Observable<any> {
    return this.cache.observe("mailboxes");
  }

  observe_mailbox(path: string): Observable<any> {
    return this.cache.observe("mailbox:"+path);
  }

  observe_messages(path: string): Observable<any> {
    return this.cache.observe_by_prefix("envelope:"+path+":");
  }

  isLoggedIn(): boolean {
    return this.imapClient && this.cache.isOpen();
  }

  login(): Promise<any> {
    this.cache.store("account",this._accountData);

    const ImapClient = require('emailjs-imap-client');

    let client = new ImapClient(
      this._accountData.host,
      Number(this._accountData.port),
      {
        auth: {
          user: this._accountData.user,
          pass: this._accountData.pass,
        },
        requireTLS: true,
      });

    client.logLevel = ImapClient.LOG_LEVEL_INFO;

    return client.connect().catch((err)=>{
      console.error("login failed: " + err);
      client.close();
      throw err;
    }).then(()=>{
      client.onerror = (err)=>{
        console.error("imapClient error: " + err);
        this.logout();
      }
      this.imapClient = client;
      console.info("logged in");
    });
  }

  logout(): void {
    if(this.imapClient) {
      this.imapClient.close();
      this.imapClient = undefined;
    }
  }

  updateMailboxes(): Promise<any> {
    if(!this.isLoggedIn())
      throw "imapClient is not logged in!"

    return this.imapClient.listMailboxes().then((mailboxes)=>{
      return this.cache.store("mailboxes", mailboxes);
    });
  }

  updateMailbox(path: string): void {
    if(!this.isLoggedIn())
      throw "imapClient is not logged in!"

    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      return this.cache.store("mailbox:"+path, mailbox);
    }).then(()=>{
      let p_imapmsgs = this.imapClient.listMessages(path,"1:*",['uid']);
      let p_cachemsgs = this.cache.retrieve_by_prefix("envelope:"+path+":");
      return Promise.all([p_imapmsgs,p_cachemsgs]);
    }).then(([imapmsgs,cachemsgs])=>{
      let imapuids = new Set(imapmsgs.map(({uid})=>uid));
      let cacheuids = new Set(cachemsgs.map(({_id})=>Number(_id.split(':').pop())));
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

      return this.cache.store_bulk(new_messages);
    }).then(()=>{
      return this.cache.retrieve_by_prefix("envelope:"+path+":");
    }).then((messages)=>{
      // console.log("retrieved messages: " + JSON.stringify(messages,null,'\t'));
    });
  }

  updateAll(): void {
    this.cache.retrieve("mailboxes").then((mailboxes)=>{
      this.updateMailboxes().then(()=>{
        let updateRecursively = ((children:any[])=>{
          for(let child of children) {
            this.updateMailbox(child.path);
            updateRecursively(child.children);
          }
        })
        updateRecursively(mailboxes.children);
      });
    })
  }
}
