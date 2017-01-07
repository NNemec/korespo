import { Component } from '@angular/core';

import { Observable } from 'rxjs/Rx';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder-view',
  templateUrl: 'folder-view.component.html'
})
export class FolderViewComponent {
  mailboxes: Observable<any>;

  constructor(
    private imapClientService: ImapClientService,
  ) {
    this.mailboxes = imapClientService.mailboxes();
    console.log(this.mailboxes)
  }
}
