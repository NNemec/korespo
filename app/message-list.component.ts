import { Component, OnInit, OnDestroy } from '@angular/core';

import { DataTable } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'message-list',
  templateUrl: 'message-list.component.html'
})
export class MessageListComponent implements OnInit, OnDestroy {
  selectedPath: string;
  liveFeed: any;
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
    if(this.liveFeed)
      this.liveFeed.cancel();
    this.liveFeed = undefined;
    this.selectedPath = undefined;
    this.tableData = [];
    this.selectedMessages = [];
  }

  onSelectPath(path: string) {
    if( path == this.selectedPath )
      return;

    this.reset();

    this.liveFeed = this.imapClientService.observe_messages(path)
    .on("ready",()=>{
    })
    .on("update",(update,aggregate)=>{
      this.tableData = aggregate;
    })
    .on("cancelled",()=>{
    })
    .on("error",(err)=>{
    });
  }

  onSelectMessages(event) {
    let selectedMessage = event.node
  }
}
