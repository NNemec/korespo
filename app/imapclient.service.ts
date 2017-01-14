import { Injectable, NgZone } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import { PouchCache } from './pouch-cache';

declare const nodeRequire: (string)=>any;

export class AccountData {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
}

@Injectable()
export class ImapClientService {
  cache: PouchCache;
  accountData = new AccountData;
  imapClient: any;
  onStatusChanged = new Subject<void>();

  constructor(private ngZone: NgZone) {
    this.open();
  }

  isOpen(): boolean {
    return this.cache.isOpen();
  }

  open(): void {
    this.cache = new PouchCache("imapcache");

    this.cache.retrieve("account").then((doc) => {
      this.accountData = doc;
    }).catch(()=>{
    });
  }

  close(): void {
    this.cache.close();
  }

  // PouchCache change notification do not run inside ngZone. Need this wrapper in between
  ngZoneWrap<T>(obs: Observable<T>): Observable<T> {
    return new Observable<T>((observer)=>{
      let subscription = obs.subscribe((val)=>{
        this.ngZone.run(()=>observer.next(val));
      })
      return ()=>subscription.unsubscribe();
    });
  }

  observe_mailboxes(): Observable<any> {
    return this.ngZoneWrap(this.cache.observe("mailboxes"));
  }

  observe_mailbox(path: string): Observable<any> {
    return this.ngZoneWrap(this.cache.observe("mailbox:"+path));
  }

  observe_messages(path: string): Observable<any> {
    return this.ngZoneWrap(this.cache.observe_by_prefix("envelope:"+path+":"));
  }

  isLoggedIn(): boolean {
    return this.imapClient && this.cache.isOpen();
  }

  login(): Promise<any> {
    this.cache.store("account",this.accountData);

    const ImapClient = nodeRequire('emailjs-imap-client');

    let client = new ImapClient(
      this.accountData.host,
      Number(this.accountData.port),
      {
        auth: {
          user: this.accountData.user,
          pass: this.accountData.pass,
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
