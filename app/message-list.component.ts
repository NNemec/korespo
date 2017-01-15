import { Component, OnInit, OnDestroy, Input, SimpleChanges,
         ChangeDetectionStrategy } from '@angular/core';

import { DataTable } from 'primeng/primeng';
import { Subscription } from 'rxjs';

import * as moment from 'moment';

import { ImapClientService } from './imapclient.service';


@Component({
  moduleId: module.id,
  selector: 'message-list-internal',
  templateUrl: 'message-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageListInternalComponent {
  @Input() tableData: any[];

  selectedMessages: any[];

  cols = [
    { header:"Subject", field:"envelope.subject", format: d=>d.envelope.subject },
    { header:"From",    field:"envelope.from",    format: d=>this.formatAddrList(d.envelope.from) },
    { header:"To",      field:"envelope.to",      format: d=>this.formatAddrList(d.envelope.to) },
    { header:"Date",    field:"envelope.date",    format: d=>this.formatDate(d.envelope.date) },
  ];

  columnOptions = this.cols.map((col)=>({label: col.header,value: col}));

  formatAddrList(addrList:{address:string,name:string}[]): string {
//    return addrList ? addrList.map(({address,name})=>`${name} <${address}>`).join(', ') : "";
    return addrList ? addrList.map(({address,name})=>name).join(', ') : "";
  }

  formatDate(dateRFC2822:string): string {
    return moment(dateRFC2822,"ddd, DD MMM YYYY HH:mm:ss ZZ").calendar(null, {
      sameDay: '[Today] hh:mm',
      nextDay: '[Tomorrow] hh:mm',
      nextWeek: 'MMM D, YYYY',
      lastDay: '[Yesterday] hh:mm',
      lastWeek: 'MMM D, YYYY',
      sameElse: 'MMM D, YYYY'
    });
  }

  onSelectMessages(event) {
    let selectedMessage = event.node
    console.log(selectedMessage._id)
  }
}

@Component({
  moduleId: module.id,
  selector: 'message-list',
  template: '<message-list-internal [tableData]="tableData"></message-list-internal>'
})
export class MessageListComponent implements OnInit, OnDestroy {
  @Input() folderPath: string;

  subscription: Subscription;
  tableData: any[];

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.reset();
  }

  ngOnDestroy() {
    this.reset();
  }

  reset() {
    if(this.subscription)
      this.subscription.unsubscribe();
    this.subscription = undefined;
    this.tableData = [];
  }

  ngOnChanges(changes: SimpleChanges) : void {
    if("folderPath" in changes) {
      this.onFolderPathChanged();
    }
  }

  onFolderPathChanged() {
    if( !this.folderPath )
      return;

    this.reset();

    this.subscription = this.imapClientService.observe_messages(this.folderPath)
    .subscribe((messages)=>{
      this.tableData = messages;
    });
  }
}
