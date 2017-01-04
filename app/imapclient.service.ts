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
  folders: any;
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
    this.folders = undefined;
    this.selectedPath = undefined;
  }

  updateMailboxes(): void {
    this.selectedPath = undefined;
    this.imapClient.listMailboxes().then((mailboxes)=>{
      this.cache.store("mailboxes", mailboxes);
      this.folders = mailboxes.children;
    });
  }

  select(path: string): void {
    this.selectedPath = path;
    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      this.cache.store("mailbox:"+path, mailbox);
    });
  }
}
