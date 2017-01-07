import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder-view',
  templateUrl: 'folder-view.component.html'
})
export class FolderViewComponent implements OnInit, OnDestroy {
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
