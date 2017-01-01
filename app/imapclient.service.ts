import { Injectable } from '@angular/core';

// -- no idea why this does not work, I had to use ../requirements.js instead
// import { ImapClient } from 'emailjs-imap-client';
// import { ElectronStorage } from 'electron-storage';
declare const ImapClient: any;
declare const ElectronStorage: any;
declare const NodePouchDB: any;
declare const ElectronRemote: any;

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
  folders: any;
  cache: any;
  selectedPath: string;

  constructor() {
    this.accountData = new AccountData;
    ElectronStorage.get('AccountData').then(data=>{
      this.accountData = data;
    });
  }

  isLoggedIn(): boolean {
    return this.imapClient;
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

    this.imapClient.connect().then(()=>{
      console.log("logged in");
      ElectronStorage.set('AccountData', this.accountData);
      this.init();
    }).catch(()=>{
      console.log("login failed");
      this.deinit();
    })
  }

  logout(): void {
    this.imapClient.close();
    this.deinit();
  }

  init(): void {
    this.cache = new NodePouchDB(ElectronRemote.app.getPath('userData') + "/imapcache:"+this.accountData.user+"@"+this.accountData.host+":"+this.accountData.port);
    this.cache.info().then((info)=>{
      console.log("created PouchDB: " + JSON.stringify(info));
    }).catch((err)=>{
      console.log("failed to create PouchDB: " + JSON.stringify(err));      
    });

    this.selectedPath = undefined;
    this.imapClient.listMailboxes().then((mailboxes)=>{
      this.folders = mailboxes.children;
    });
  }

  deinit(): void {
    this.folders = undefined;
    this.imapClient = undefined;    
    this.cache = undefined;
    this.selectedPath = undefined;
  }

  select(path: string): void {
    this.selectedPath = path;
    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      console.log("received data: " + JSON.stringify(mailbox));
      mailbox._id = "mailbox:"+path;
      this.cache.get(mailbox._id).then((doc)=>{
        console.log("found previous data: " + JSON.stringify(doc));
        mailbox._rev = doc._rev;
      }).catch((err)=>{
        console.log("no previous data found.");
      }).then((doc)=>{
        console.log("storing new data: " + JSON.stringify(mailbox));
        this.cache.put(mailbox);
      });
    });
  }
}
