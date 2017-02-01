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
  `],
})
export class AddressPaneComponent implements OnInit {
  addresses: Imap.AddrStats[] = [];
  subscription: Subscription;

  private _selectedAddresses: Imap.AddrStats[] = [];
  get selectedAddresses(): Imap.AddrStats[] {
    return this._selectedAddresses;
  }
  set selectedAddresses(val: Imap.AddrStats[]) {
    this._selectedAddresses = val;
    this.imapClientService.filterAddresses(val.map(addrStats=>addrStats.addr));
  }

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.observeAddresses().subscribe((addrs:Imap.AddrStats[])=>{
      this.addresses = addrs;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
