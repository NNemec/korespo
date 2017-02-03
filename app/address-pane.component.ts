import { Component, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { ImapClientService } from './imapclient.service';

import * as Imap from '../lib/imapcache';

@Component({
  moduleId: module.id,
  selector: 'address-pane',
  templateUrl: 'address-pane.component.html',
  styles: [`
    * >>> .ui-datatable-scrollable-wrapper {
      height:100%
    }

    * >>> .ui-datatable-scrollable-view {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    * >>> .ui-datatable-scrollable-body {
      flex: 1 1 0;
    }

    * >>> .ui-datatable .ui-datatable-data>tr {
      border: 0;
    }
    * >>> .ui-datatable .ui-datatable-data>tr>td {
      border: 0;
      padding: .1em .1em;
    }
  `],
})
export class AddressPaneComponent implements OnInit {
  contacts: Imap.Contact[] = [];
  subscription: Subscription;

  private _selectedContacts: Imap.Contact[] = [];
  get selectedContacts(): Imap.Contact[] {
    return this._selectedContacts;
  }
  set selectedContacts(val: Imap.Contact[]) {
    this._selectedContacts = val;
    this.imapClientService.filterContacts(val);
  }

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.contacts.subscribe((contacts:Imap.Contact[])=>{
      this.contacts = contacts;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
