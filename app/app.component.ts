import { Component } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  selector: 'my-app',
  template: `<h1>koresp - experimental email client</h1>
  <div> <label>host: </label> <input [(ngModel)]="imapClientService.accountData.host" placeholder="host"> </div>
  <div> <label>port: </label> <input [(ngModel)]="imapClientService.accountData.port" placeholder="port"> </div>
  <div> <label>user: </label> <input [(ngModel)]="imapClientService.accountData.user" placeholder="user"> </div>
  <div> <label>pass: </label> <input [(ngModel)]="imapClientService.accountData.pass" placeholder="pass"> </div>
  `
})
export class AppComponent {
  constructor(private imapClientService: ImapClientService) { }
}
