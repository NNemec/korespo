import { Component, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { ImapClientService } from './imapclient.service';

import * as Imap from '../lib/imapcache';

@Component({
  moduleId: module.id,
  selector: 'my-app',
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
  showSetup: boolean = false;

  account: Imap.Account;
  subscription: Subscription;

  constructor(
    private imapClientService: ImapClientService,
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.account.subscribe(account=>{
      this.account = account;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleSetup() {
    this.showSetup = !this.showSetup;
  }
}
