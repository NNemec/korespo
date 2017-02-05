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

const AddrHdrs = ["from", "sender", "reply-to", "to", "cc", "bcc"];

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

/*****************************************************************************/

export interface Contact {
  addrs: AddrStats[];
  total: AddrStats;
}

export interface AddrStats {
  contact: Contact;
  addr: Address;
  "from": number;
  "sender": number;
  "reply-to": number;
  "to": number;
  "cc": number;
  "bcc": number;
}

export interface ImapModel {

  readonly mailboxes: Observable<Mailboxes>;
  readonly contacts: Observable<Contact[]>;
//  readonly flags: Observable<string[]>;

//  readonly filteredDates: Observable<Moment[]>;           // ignoring Date filter

//  filterStartDate: Moment;
//  filterEndDate: Moment;

  readonly filteredMessages: Observable<Envelope[]>;

//  filterAddresses: {addr:Address,hdr?:AddrHdr}[];
  filterMailboxes: Mailbox[];
//  filterFlags: {flag:string,invert:boolean}[];

//  countMsgsPerAddress(addr:Address,hdr?:string): Observable<Number>;
  countMsgsPerMailbox(mbx:Mailbox): Observable<Number>;
//  countMsgsPerFlag(flag:string): Observable<Number>;
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
  private _statisticsPerMailbox: Observable<Map<string,number>>;
  private _messagesPerAddress: Observable<Map<string,Set<Envelope>[]>>;

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

    this._statisticsPerMailbox = this.allMessages.flatMap((msgs:Envelope[])=>{
      return Observable.from(msgs).reduce((res:Map<string,number>,env:Envelope)=>{
        let path = env._id.split(':',2)[1];
        res.set(path,(v=>v?v+1:1)(res.get(path)));
        return res;
      },new Map<string,number>());
    }).publishBehavior(new Map<string,number>()).refCount();

    this._messagesPerAddress = this.allMessages.flatMap((msgs:Envelope[])=>{
      let newEntry = ()=>AddrHdrs.map(hdr=>new Set<Envelope>());
      return Observable.from(msgs).reduce((res:Map<string,Set<Envelope>[]> = new Map<string,Set<Envelope>[]>(),
                                           env:Envelope)=>{
        for(let hdrIdx = 0; hdrIdx < AddrHdrs.length; hdrIdx++) {
          let addrs = env.envelope[AddrHdrs[hdrIdx]];
          if(addrs) {
            for(let addr of addrs) {
              let strAddr = addr.name + '\n' + addr.address
              if(!res.has(strAddr)) {
                res.set(strAddr,newEntry())
              }
              res.get(strAddr)[hdrIdx].add(env);
            }
          }
        }
        return res;
      },undefined);
    }).publishBehavior(new Map<string,Set<Envelope>[]>()).refCount();
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

  get mapMailboxes(): Observable<Map<string,Mailbox>> {
    return this.mailboxes.map((mbxs:Mailboxes)=>{
      let res = new Map<string,Mailbox>();
      let recursion = (mbxs:Mailbox[])=>{
        mbxs.forEach((mbx)=>{
          res.set(mbx.path, mbx);
          recursion(mbx.children);
        });
      };
      recursion(mbxs.children);
      return res;
    });
  }

  get contacts(): Observable<Contact[]> {
    return this._messagesPerAddress.map(entries=>{
      let map = new Map<string,Contact>();

      entries.forEach((value: Set<Envelope>[], key: string)=>{
        let addrSplit = key.split('\n',2);
        let addr: Address = { name: addrSplit[0], address: addrSplit[1] };
        let lowerCaseAddr = addr.address.toLowerCase();
        let contact: Contact;
        if(map.has(lowerCaseAddr)) {
          contact = map.get(lowerCaseAddr);
        } else {
          contact = { addrs: [], total: {
            contact: contact,
            addr: addr,
            "from": 0,
            "sender": 0,
            "reply-to": 0,
            "to": 0,
            "cc": 0,
            "bcc": 0,
          } }
          map.set(lowerCaseAddr,contact);
        }

        let stats: AddrStats = {
          contact: contact,
          addr: addr,
          "from": value[0].size,
          "sender": value[1].size,
          "reply-to": value[2].size,
          "to": value[3].size,
          "cc": value[4].size,
          "bcc": value[5].size,
        };

        contact.addrs.push(stats);
      });

      let contacts: Contact[] = [];
      map.forEach(contact=>{
        let maxFrom = 0;
        let maxDst = 0;
        contact.addrs.forEach(stats=>{
          if(stats.from > maxFrom) {
            maxFrom = stats.from;
            contact.total.addr = stats.addr;
          }
          if(maxFrom == 0 && stats.to + stats.cc + stats.bcc > maxDst) {
            maxDst = stats.to + stats.cc + stats.bcc;
            contact.total.addr = stats.addr;
          }
          contact.total.from += stats.from;
          contact.total.sender += stats.sender;
          contact.total["reply-to"] += stats["reply-to"];
          contact.total.to += stats.to;
          contact.total.cc += stats.cc;
          contact.total.bcc += stats.bcc;
        });

        contacts.push(contact);
      })
      return contacts;
    });
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

  countMsgsPerMailbox(mbx:Mailbox): Observable<number> {
    return this._statisticsPerMailbox.map(map=>map.get(mbx.path));
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
