import { Component, ChangeDetectorRef, OnInit } from '@angular/core';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'my-app',
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
  constructor(
    private imapClientService: ImapClientService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.imapClientService.onChanged.subscribe(() => {
      this.cd.detectChanges();
    })
  }
}
