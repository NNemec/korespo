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
  mailboxes: any;
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
    return this.imapClient && this.mailboxes && this.cache.isOpen();
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
        this.cache.retrieve("mailboxes",{
          observe: true,
          default: { root: true, children: []},
        }).then((mailboxes) => {
          this.mailboxes = mailboxes;
        });
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
    this.mailboxes = undefined;
    this.selectedPath = undefined;
  }

  updateMailboxes(): void {
    this.selectedPath = undefined;
    this.imapClient.listMailboxes().then((mailboxes)=>{
      return this.cache.store("mailboxes", mailboxes);
    }).then(()=>{
/*
      let updateRecursively = ((children:any[])=>{
        for(let child of children) {
          this.select(child.path);
          updateRecursively(child.children);
        }
      })
      updateRecursively(this.mailboxes.children)
*/
    });
  }

  select(path: string): void {
    this.selectedPath = path;
    this.imapClient.selectMailbox(path,{readOnly:true}).then((mailbox)=>{
      this.cache.store("mailbox:"+path, mailbox);
    });
  }
}
