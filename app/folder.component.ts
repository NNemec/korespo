import {Component, Input} from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.css']
})
export class FolderComponent {
  @Input() folders: any[];
  constructor(private imapClientService: ImapClientService) { }
}
