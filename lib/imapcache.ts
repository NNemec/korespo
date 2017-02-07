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

export interface MailboxTree {
  children: Mailbox[];
};

export interface NamedAddr {
  address: string;
  name: string;
};

export interface MsgSummary {
  _id: string;
  flags?: string[];
  envelope: {
    "date"?: string;
    "subject"?: string;
    "from"?: NamedAddr[];
    "sender"?: NamedAddr[];
    "reply-to"?: NamedAddr[];
    "to"?: NamedAddr[];
    "cc"?: NamedAddr[];
    "bcc"?: NamedAddr[];
    "message-id"?: string;
    "in-reply-to"?: string;
  };
};

/*****************************************************************************/

export class Contact {
  displayName: string;
  addrs: AddrStats[] = [];
  total = new AddrStats();
}

export class AddrStats {
  contact: Contact;
  addr: NamedAddr;
  from = 0;
  to = 0;
  cc = 0;

  constructor(addr?:NamedAddr) {
    if(addr) {
      this.addr = { address: addr.address, name: addr.name }
    }
  }

  add(other: AddrStats) {
    this.from += other.from;
    this.to += other.to;
    this.cc += other.cc;
  }
}

export interface ImapModel {

  readonly mailboxTree: Observable<MailboxTree>;
  readonly contacts: Observable<Contact[]>;
//  readonly flags: Observable<string[]>;

//  readonly filteredDates: Observable<Moment[]>;           // ignoring Date filter

//  filterStartDate: Moment;
//  filterEndDate: Moment;

  readonly filteredMessages: Observable<MsgSummary[]>;

  filterContacts: Contact[];
  filterMailboxes: Mailbox[];
//  filterFlags: {flag:string,invert:boolean}[];

//  countMsgsPerAddress(addr:NamedAddr,hdr?:string): Observable<Number>;
  countMsgsPerMailbox(mbx:Mailbox): Observable<Number>;
//  countMsgsPerFlag(flag:string): Observable<Number>;
};


/*****************************************************************************/

export class Account {
  host: string = "";
  port: number = 0;
  user: string = "";
  pass: string = "";
};

/*****************************************************************************/

export class ImapCache implements ImapModel {
  private emailjsImapClient: any;

  private db: any;
  private _isOpen = false;

  isOpen(): boolean {
    return this._isOpen;
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

  account: Observable<Account>;

  allMessages: Observable<MsgSummary[]>;
  private _statisticsPerMailbox: Observable<{[id:string]:number}>;
  private _messagesPerAddress: Observable<{[id:string]:AddrStats}>;

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

    this.account = (this.observe("account") as Observable<Account>).publishBehavior(new Account).refCount();

    this.allMessages = (this.observe_by_prefix("summary:") as Observable<MsgSummary[]>).debounceTime(100).publishBehavior([]).refCount();

    this._statisticsPerMailbox = this.allMessages.map((msgs:MsgSummary[])=>{
      let res: {[id:string]:number} = {};
      for(let msg of msgs) {
        let path = msg._id.split(':',2)[1];
        res[path] = (res[path] || 0) + 1;
      }
      return res;
    }).publishBehavior({}).refCount();

    this._messagesPerAddress = this.allMessages.map(msgs=>{
      let res: {[id:string]:AddrStats} = {};
      for(let msg of msgs)
        for(let hdr of ["from","to", "cc"])
          for(let addr of msg.envelope[hdr] || []) {
            let strAddr = addr.name + '\n' + addr.address
            let stats = res[strAddr];
            if(!stats)
              stats = res[strAddr] = new AddrStats(addr);
            stats[hdr] += 1;
          }
      return res;
    }).publishBehavior({}).refCount();
  }

  close(): void {
    if(this.db) {
      this.db.close();
      this.db = undefined;
      this._isOpen = false;
    }
  }

  get mailboxTree(): Observable<MailboxTree> {
    return this.observe("mailboxes") as Observable<MailboxTree>;
  }

  get mapMailboxes(): Observable<Map<string,Mailbox>> {
    return this.mailboxTree.map((mbxs:MailboxTree)=>{
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
      let map: {[id:string]:Contact} = {};

      for(let key in entries) {
        let stats = entries[key];
        let addrSplit = key.split('\n',2);
        let addr: NamedAddr = { name: addrSplit[0], address: addrSplit[1] };
        let lowerCaseAddr = addr.address.toLowerCase();
        let contact = map[lowerCaseAddr];

        if(!contact)
          contact = map[lowerCaseAddr] = new Contact();

        contact.addrs.push(stats);
        stats.contact = contact;
      };

      let contacts: Contact[] = [];
      for(let id in map) {
        let contact = map[id];
        let maxFrom = 0;
        let maxDst = 0;
        contact.addrs.forEach(stats=>{
          if(stats.from > maxFrom) {
            maxFrom = stats.from;
            contact.total.addr = stats.addr;
          }
          if(maxFrom == 0 && stats.to + stats.cc > maxDst) {
            maxDst = stats.to + stats.cc;
            contact.total.addr = stats.addr;
          }
          contact.total.add(stats);
        });
        contact.displayName = contact.total.addr.name;
        if(contact.displayName === "")
          contact.displayName = contact.total.addr.address;

        contacts.push(contact);
      }
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

  private _filterContacts = new BehaviorSubject<Contact[]>([]);

  set filterContacts(val: Contact[]) {
    this._filterContacts.next(val);
  }

  get filterContacts(): Contact[] {
    return this._filterContacts.value;
  }

  get filteredMessages(): Observable<MsgSummary[]> {
    return Observable.combineLatest([
      this.allMessages,
      this._filterMailboxes,
      this._filterContacts,
    ],(msgs:MsgSummary[],mbxs:Mailbox[],ctts:Contact[])=>{
      let res = msgs;

      if(mbxs.length > 0) {
        let paths = new Set(mbxs.map(mbx=>mbx.path));
        console.log("filtering: " + paths);
        res = res.filter(msg=>paths.has(msg._id.split(':',2)[1]));
      }

      if(ctts.length > 0) {
        function* gen() {
          for(let ctt of ctts)
            for(let addr of ctt.addrs)
              yield addr.addr.name + "\n" + addr.addr.address;
        };

        let addrs = new Set<string>(gen());

        res = res.filter(msg=>{
          for(let addr of msg.envelope.from || [])
            if(addrs.has(addr.name + "\n" + addr.address))
              return true;
          for(let addr of msg.envelope.to || [])
            if(addrs.has(addr.name + "\n" + addr.address))
              return true;
          for(let addr of msg.envelope.cc || [])
            if(addrs.has(addr.name + "\n" + addr.address))
              return true;
        });
      }

      return res;
    });
  }

  countMsgsPerMailbox(mbx:Mailbox): Observable<number> {
    return this._statisticsPerMailbox.map(map=>map[mbx.path]);
  }

  set selectedMessage(msg: MsgSummary) {
  }

  isLoggedIn(): boolean {
    return this.emailjsImapClient && this.isOpen();
  }

  login(account: Account): Promise<any> {
    this.store({...account, _id:"account"});

    const EmailjsImapClient = require('emailjs-imap-client');

    let client = new EmailjsImapClient(
      account.host,
      Number(account.port),
      {
        auth: {
          user: account.user,
          pass: account.pass,
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

  updateMailboxes(): Promise<MailboxTree> {
    if(!this.isLoggedIn())
      return Promise.reject<MailboxTree>("imapClient is not logged in!");

    return this.emailjsImapClient.listMailboxes()
    .then((mailboxTree)=>
      this.store({...mailboxTree, _id:"mailboxes"})
      .then(()=>mailboxTree)
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
      let p_cachemsgs = this.retrieve_by_prefix("summary:"+path+":");
      return Promise.all([p_imapmsgs,p_cachemsgs]);
    }).then(([imapmsgs,cachemsgs])=>{
      let imapuids = new Set(imapmsgs.map(({uid})=>uid));
      let cacheuids = new Set(cachemsgs.map(({_id})=>Number(_id.split(':').pop())));
      let to_delete = Array.from(cacheuids).filter(uid=>!imapuids.has(uid));
      let to_create = Array.from(imapuids).filter(uid=>!cacheuids.has(uid));

      // handle to_delete here

      return  to_create.length == 0 ? []
          : this.emailjsImapClient.listMessages(
              path,
              to_create.join(','),
              ['uid','flags','envelope','rfc822.size','bodystructure'],
              {byUid:true}
            );

    }).then((new_messages)=>{
      for(let message of new_messages) {
        delete message["#"];
        message._id = "summary:"+path+":"+message.uid;
      }

      // console.log("storing messages: " + JSON.stringify(new_messages,null,'\t'));

      return this.store_bulk(new_messages);
    }).then(()=>{
      return this.retrieve_by_prefix("summary:"+path+":");
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
    .then(mailboxTree=>updateTreeRecursively(mailboxTree.children));
  }
}

/*****************************************************************************/
