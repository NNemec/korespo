import { Component, AfterViewInit } from '@angular/core';

import { ImapClientService } from './imapclient.service';

import * as Imap from '../lib/imapcache';

@Component({
  moduleId: module.id,
  selector: 'my-app',
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  showSetup: boolean = false;

  constructor(
    private imapClientService: ImapClientService,
  ) {}

  ngAfterViewInit() {
  }

  toggleSetup() {
    this.showSetup = !this.showSetup;
  }
}
