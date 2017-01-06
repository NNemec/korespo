import { Component } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder-view',
  templateUrl: 'folder-view.component.html'
})
export class FolderViewComponent {
  constructor(
    private imapClientService: ImapClientService,
  ) {}
}
