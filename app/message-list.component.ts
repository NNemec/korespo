import { Component, OnInit, OnDestroy, Input, SimpleChanges } from '@angular/core';

import { DataTable } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'message-list',
  templateUrl: 'message-list.component.html'
})
export class MessageListComponent implements OnInit, OnDestroy {
  @Input() folderPath: string;

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

    this.liveFeed = this.imapClientService.observe_messages(this.folderPath)
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
    console.log(selectedMessage._id)
  }
}
