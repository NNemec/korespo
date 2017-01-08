import { Component, Input, OnInit, OnDestroy } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.css']
})
export class FolderComponent {
  @Input() folder: any;

  mailbox = {};
  subscription: any;

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.mailbox(this.folder.path).subscribe((mailbox)=>{
      this.mailbox = mailbox;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
