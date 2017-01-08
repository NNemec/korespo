import { Component, OnInit, OnDestroy } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'account',
  templateUrl: 'account.component.html'
})
export class AccountComponent implements OnInit, OnDestroy {
  mailboxes = [];
  subscription: any;

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.mailboxes().subscribe((mailboxes)=>{
      this.mailboxes = mailboxes.children;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
