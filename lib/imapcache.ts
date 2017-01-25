import { Observable } from 'rxjs';

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

import { remote as ElectronRemote } from 'electron';

import { pouchdb_observe, pouchdb_store } from './util';


export class AccountData {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
}

export class ImapCache {
  private emailjsImapClient: any;
  private _accountData = new AccountData;

  private db: any;
  private _isOpen = false;

  isOpen(): boolean {
    return this._isOpen;
  }

  accountData(): AccountData {
    return this._accountData;
  }

  dbAccess(): any {
    return this.db;
  }

  /*
   * raw db access
   */

  retrieve(id: string): Promise<any> {
    return this.db.get(id);
  }

  retrieve_by_prefix(prefix:string): Promise<any[]> {
    return this.db.find({
      selector: { $and: [
        { _id: { $gte: prefix } },
        { _id: { $lte: prefix + '\uffff' } }
      ]},
    }).then((result:{docs:any[]})=>result.docs);
  }

  observe(id: string): Observable<any> {
    return pouchdb_observe(this.db,{
      selector: { _id: id },
      aggregate: true,
    }).filter(v=>v.length==1).map(v=>v[0]);
  }

  observe_by_prefix(prefix:string): Observable<any[]> {
    return pouchdb_observe(this.db,{
      selector: { $and: [
        { _id: { $gte: prefix } },
        { _id: { $lte: prefix + '\uffff' } }
      ]},
      aggregate: true
    });
  }

  store(id: string,newdoc: any): Promise<any> {
    return pouchdb_store(this.db, id, newdoc);
  }

  store_bulk(newdocs: any[]): Promise<any> {
    return this.db.bulkDocs(newdocs);
  }



  constructor(path: string = undefined) {
    if(!path)
      path = (ElectronRemote ? ElectronRemote.app.getPath('userData') : '.') + "/imapcache"

    this.db = new PouchDB(path);

    this.db.info().catch((err)=>{
      console.error("failed to open PouchDB: " + path);
      console.error(err);
      this.db.close();
      this.db = undefined
    }).then((info)=>{
      console.info("successfully opened PouchDB: " + path);
      console.info(info);
      this._isOpen = true;
    });

    this.retrieve("account").then((doc) => {
      this._accountData = doc;
    }).catch(()=>{
    });

  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
      this._isOpen = false;
    }
  }

  observe_mailboxes(): Observable<any> {
    return this.observe("mailboxes");
  }

  observe_mailbox(path: string): Observable<any> {
    return this.observe("mailbox:"+path);
  }

  observe_messages(path: string): Observable<any> {
    return this.observe_by_prefix("envelope:"+path+":");
  }



  isLoggedIn(): boolean {
    return this.emailjsImapClient && this.isOpen();
  }

  login(): Promise<any> {
    this.store("account",this._accountData);

    const EmailjsImapClient = require('emailjs-imap-client');

    let client = new EmailjsImapClient(
      this._accountData.host,
      Number(this._accountData.port),
      {
        auth: {
          user: this._accountData.user,
          pass: this._accountData.pass,
        },
        requireTLS: true,
      });

    client.logLevel = EmailjsImapClient.LOG_LEVEL_INFO;

    return client.connect().catch((err)=>{
      console.error("login failed: " + err);
      client.close();
      throw err;
    }).then(()=>{
      client.onerror = (err)=>{
        console.error("imapClient error: " + err);
        this.logout();
      }
      this.emailjsImapClient = client;
      console.info("logged in");
    });
  }

  logout(): void {
    if(this.emailjsImapClient) {
      this.emailjsImapClient.close();
      this.emailjsImapClient = undefined;
    }
  }

  updateMailboxes(): Promise<any> {
    if(!this.isLoggedIn())
      throw "imapClient is not logged in!"

    return this.emailjsImapClient.listMailboxes().then((mailboxes)=>{
      return this.store("mailboxes", mailboxes);
    });
  }

  updateMailbox(path: string): void {
    if(!this.isLoggedIn())
      throw "imapClient is not logged in!"

    this.emailjsImapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      return this.store("mailbox:"+path, mailbox);
    }).then(()=>{
      let p_imapmsgs = this.emailjsImapClient.listMessages(path,"1:*",['uid']);
      let p_cachemsgs = this.retrieve_by_prefix("envelope:"+path+":");
      return Promise.all([p_imapmsgs,p_cachemsgs]);
    }).then(([imapmsgs,cachemsgs])=>{
      let imapuids = new Set(imapmsgs.map(({uid})=>uid));
      let cacheuids = new Set(cachemsgs.map(({_id})=>Number(_id.split(':').pop())));
      let to_delete = Array.from(cacheuids).filter(uid=>!imapuids.has(uid));
      let to_create = Array.from(imapuids).filter(uid=>!cacheuids.has(uid));

      // handle to_delete here

      return  to_create.length == 0 ? []
          : this.emailjsImapClient.listMessages(path,to_create.join(','),['uid','flags','envelope'],{byUid:true});

    }).then((new_messages)=>{
      for(let message of new_messages) {
        delete message["#"];
        message._id = "envelope:"+path+":"+message.uid;
      }

      // console.log("storing messages: " + JSON.stringify(new_messages,null,'\t'));

      return this.store_bulk(new_messages);
    }).then(()=>{
      return this.retrieve_by_prefix("envelope:"+path+":");
    }).then((messages)=>{
      // console.log("retrieved messages: " + JSON.stringify(messages,null,'\t'));
    });
  }

  updateAll(): void {
    this.retrieve("mailboxes").then((mailboxes)=>{
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
