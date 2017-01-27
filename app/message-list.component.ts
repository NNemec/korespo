import { Component,
         OnInit, OnDestroy, OnChanges,
         Input, SimpleChanges,
         ChangeDetectionStrategy } from '@angular/core';

import { DataTable } from 'primeng/primeng';
import { Subscription } from 'rxjs';

import * as moment from 'moment';

import { ImapClientService } from './imapclient.service';

import *  as Imap from '../lib/imapcache';

@Component({
  moduleId: module.id,
  selector: 'addresses-view',
  template: `<span class="ui-cell-data">{{ formatted }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressesViewComponent implements OnChanges {
  @Input() addresses: Imap.Address[] = [];

  formatted: string;

  ngOnChanges(changes: SimpleChanges) : void {
    if("addresses" in changes) {
      this.formatted = this.format(this.addresses)
    }
  }

  format(addrList:Imap.Address[]): string {
//    return addrList ? addrList.map(({address,name})=>`${name} <${address}>`).join(', ') : "";
    return addrList ? addrList.map(({address,name})=>name).join(', ') : "";
  }
}

@Component({
  moduleId: module.id,
  selector: 'date-view',
  template: `<span class="ui-cell-data">{{ formatted }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateViewComponent implements OnChanges {
  @Input() rfc2822: string;

  formatted: string;

  ngOnChanges(changes: SimpleChanges) : void {
    if("rfc2822" in changes) {
      this.formatted = moment(this.rfc2822,"ddd, DD MMM YYYY HH:mm:ss ZZ").calendar(null, {
        sameDay: '[Today] hh:mm',
        nextDay: '[Tomorrow] hh:mm',
        nextWeek: 'MMM D, YYYY',
        lastDay: '[Yesterday] hh:mm',
        lastWeek: 'MMM D, YYYY',
        sameElse: 'MMM D, YYYY'
      });
    }
  }
}


@Component({
  moduleId: module.id,
  selector: 'message-list-internal',
  templateUrl: 'message-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageListInternalComponent {
  private _messages: any[] = [];
  totalMessageCount = 0;

  @Input()
  set messages(val: any[]) {
    this._messages = val ? val : [];
    this.totalMessageCount = this._messages.length;
    this.tableData = this._messages.slice(0,this._limitMessageCount);
  };
  get messages(): any[] {
    return this._messages;
  };

  private _limitMessageCount = 50;
  set limitMessageCount(val: number) {
    this._limitMessageCount = val;
    this.tableData = this._messages.slice(0,this._limitMessageCount);
  }
  get limitMessageCount(): number {
    return this._limitMessageCount;
  }

  tableData: any[] = [];

  selectedMessages: any[] = [];

  onSelectMessages(event) {
    let selectedMessage = event.node
    console.log(selectedMessage._id)
  }
}

@Component({
  moduleId: module.id,
  selector: 'message-list',
  template: '<message-list-internal [messages]="messages"></message-list-internal>'
})
export class MessageListComponent implements OnInit, OnDestroy {
  subscription: Subscription;
  messages: Imap.Envelope[];

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.observeEnvelopes()
    .subscribe((messages:Imap.Envelope[])=>{
      this.messages = messages;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
