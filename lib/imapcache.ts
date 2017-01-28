import { Observable, BehaviorSubject, ConnectableObservable, Subscription } from 'rxjs';

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

import { remote as ElectronRemote } from 'electron';

import { promiseLoop, pouchdb_observe, pouchdb_store } from './util';

import { Moment } from 'moment';

/*****************************************************************************/

export interface Mailbox {
  name: string;
  path: string;
  children?: Mailbox[];
  flags: string[];
  specialUse?: string[];
};

export interface Mailboxes {
  children: Mailbox[];
};

export interface Address {
  address: string;
  name: string;
};

export interface Envelope {
  _id: string;
  flags?: string[];
  envelope: {
    "date"?: string;
    "subject"?: string;
    "from"?: Address[];
    "sender"?: Address[];
    "reply-to"?: Address[];
    "to"?: Address[];
    "cc"?: Address[];
    "bcc"?: Address[];
    "message-id"?: string;
    "in-reply-to"?: string;
  };
};

export interface ImapModel {

  readonly mailboxes: Observable<Mailboxes>;
//  readonly addresses: Observable<Address[]>;
//  readonly flags: Observable<string[]>;

//  readonly filteredDates: Observable<Moment[]>;           // ignoring Date filter

//  filterStartDate: Moment;
//  filterEndDate: Moment;

  readonly filteredMessages: Observable<Envelope[]>;

//  filterAddresses: {addr:Address,hdr?:string}[];
  filterMailboxes: Mailbox[];
//  filterFlags: {flag:string,invert:boolean}[];

//  countMsgPerAddress(addr:Address,hdr?:string): Observable<Number>;
  countMsgPerMailbox(mbx:Mailbox): Observable<Number>;
//  countMsgPerFlag(flag:string): Observable<Number>;
};


/*****************************************************************************/

export class AccountData {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
};

/*****************************************************************************/

export class ImapCache implements ImapModel {
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

  store(newdoc: any): Promise<any> {
    return pouchdb_store(this.db, newdoc);
  }

  store_bulk(newdocs: any[]): Promise<any> {
    return this.db.bulkDocs(newdocs);
  }


  allMessages: Observable<Envelope[]>;

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
      this._accountData = doc as AccountData;
    }).catch(()=>{
    });

    this.allMessages = (this.observe_by_prefix("envelope:") as Observable<Envelope[]>).publishBehavior([]).refCount();
  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
      this._isOpen = false;
    }
  }

  get mailboxes(): Observable<Mailboxes> {
    return this.observe("mailboxes") as Observable<Mailboxes>;
  }

  private _filterMailboxes = new BehaviorSubject<Mailbox[]>([]);

  set filterMailboxes(val: Mailbox[]) {
    this._filterMailboxes.next(val);
  }

  get filterMailboxes(): Mailbox[] {
    return this._filterMailboxes.value;
  }

  get filteredMessages(): Observable<Envelope[]> {
    return Observable.combineLatest([
      this.allMessages,
      this._filterMailboxes,
    ],(msgs:Envelope[],flts:Mailbox[])=>{
      let res = msgs;
      if(flts.length > 0) {
        let paths = new Set(flts.map(mbx=>mbx.path));
        console.log("filtering: " + paths);
        res = res.filter(msg=>paths.has(msg._id.split(':',2)[1]));
      }
      return res;
    });
  }

  countMessagesPerMailbox(mbx:Mailbox): Observable<number> {
    let prefix = "envelope:" + mbx.path + ":"
    return this.allMessages.flatMap((msgs:Envelope[])=>{
      return Observable.from(msgs).count(msg=>msg._id.startsWith(prefix));
    });
  }

  isLoggedIn(): boolean {
    return this.emailjsImapClient && this.isOpen();
  }

  login(): Promise<any> {
    this.store({...this._accountData, _id:"account"});

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
      console.error("login failed: ", err);
      client.close();
      throw err;
    }).then(()=>{
      client.onerror = (err)=>{
        console.error("imapClient error: ", err);
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

  updateMailboxes(): Promise<Mailboxes> {
    if(!this.isLoggedIn())
      return Promise.reject<Mailboxes>("imapClient is not logged in!");

    return this.emailjsImapClient.listMailboxes()
    .then((mailboxes)=>
      this.store({...mailboxes, _id:"mailboxes"})
      .then(()=>mailboxes)
    );
  }

  updateMailbox(mailbox: Mailbox): Promise<void> {
    if(!this.isLoggedIn())
      return Promise.reject("imapClient is not logged in!");

    let path = mailbox.path;

    return this.emailjsImapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      return this.store({...mailbox, _id:"mailbox:"+path});
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

  updateAll(): Promise<void> {
    let updateTreeRecursively = (children:Mailbox[]) => {
      return promiseLoop(children,(mailbox)=>
        this.updateMailbox(mailbox)
        .then(()=>updateTreeRecursively(mailbox.children))
      );
    }

    return this.updateMailboxes()
    .then(mailboxes=>updateTreeRecursively(mailboxes.children));
  }
}

/*****************************************************************************/
