import { Component, OnInit, OnDestroy, Input, SimpleChanges } from '@angular/core';

import { DataTable } from 'primeng/primeng';
import { Subscription } from 'rxjs/Rx';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'message-list',
  templateUrl: 'message-list.component.html'
})
export class MessageListComponent implements OnInit, OnDestroy {
  @Input() folderPath: string;

  subscription: Subscription;
  tableData: any[];
  
  selectedMessages: any[];

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
    this.selectedMessages = [];
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

  onSelectMessages(event) {
    let selectedMessage = event.node
    console.log(selectedMessage._id)
  }

  formatAddrList(addrList:{address:string,name:string}[]): string {
    return addrList.map((address,name)=>`{$name} <{$address}>`).join(', ');
  }
}
