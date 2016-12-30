import { Injectable } from '@angular/core';

// -- no idea why this does not work, I had to use ../requirements.js instead
// import { ImapClient } from 'emailjs-imap-client';
// import { ElectronStorage } from 'electron-storage';
declare const ImapClient: any
declare const ElectronStorage: any

export class AccountData {
  host: String = "";
  port: Number = 0;
  user: String = "";
  pass: String = "";
}

@Injectable()
export class ImapClientService {
  accountData: AccountData;

  constructor() {
    this.accountData = new AccountData;
    ElectronStorage.get('AccountData').then(data=>{
      this.accountData = data;
    });
  }

  login(): void {
    var imapClient = new ImapClient(
      this.accountData.host,
      this.accountData.port,
      {
        auth: {
          user: this.accountData.user,
          pass: this.accountData.pass,
        },
        requireTLS: true,
      });

    imapClient.connect().then(()=>{
      console.log("logged in");
      ElectronStorage.set('AccountData', this.accountData);
    }).catch(()=>{
      console.log("login failed");        
    })
  }
}