import { Injectable } from '@angular/core';

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
  }
}