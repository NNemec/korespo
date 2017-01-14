import { Component, AfterViewInit } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'my-app',
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  showSetup: boolean = false;

  currentFolderPath: string;

  constructor(
    private imapClientService: ImapClientService,
  ) {}

  ngAfterViewInit() {
    this.imapClientService.open();
  }

  toggleSetup() {
    this.showSetup = !this.showSetup;
  }

  selectFolderPath(path:string) {
    this.currentFolderPath = path;
  }
}
