import { Component } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'my-app',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  showSetup: boolean = false;

  constructor(
    private imapClientService: ImapClientService,
  ) {}

  toggleSetup() {
    this.showSetup = !this.showSetup;
  }
}
