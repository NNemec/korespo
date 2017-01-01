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

    this.imapClient.connect().then(()=>{
      console.info("logged in");
      ElectronStorage.set('AccountData', this.accountData);
      this.init();
    }).catch((err)=>{
      console.error("login failed");
      this.deinit();
      throw err;
    })
  }

  logout(): void {
    this.imapClient.close();
    this.deinit();
  }

  init(): void {
    this.cache.open("imapcache:"+this.accountData.user+"@"+this.accountData.host+":"+this.accountData.port)
      .catch((err)=>{
        this.deinit();
        throw err;
      });

    this.selectedPath = undefined;
    this.imapClient.listMailboxes().then((mailboxes)=>{
      this.folders = mailboxes.children;
    });
  }

  deinit(): void {
    this.folders = undefined;
    this.imapClient = undefined;    
    this.selectedPath = undefined;
    this.cache.close();
  }

  select(path: string): void {
    this.selectedPath = path;
    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      this.cache.store("mailbox:"+path, mailbox);
    });
  }
}
