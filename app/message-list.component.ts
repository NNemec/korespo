import { Component, OnInit, OnDestroy } from '@angular/core';

import { DataTable } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

class Message {

}

@Component({
  moduleId: module.id,
  selector: 'message-list',
  templateUrl: 'message-list.component.html'
})
export class MessageListComponent implements OnInit, OnDestroy {
  tableData: Message[] = [];
//  subscription: any;

  selectedMessages: Message[] = [];

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
/*
    this.subscription = this.imapClientService.messages(path).subscribe((messages)=>{
      let converter = (imapNode)=>{
        let res: TreeNode = {data:imapNode}
        if("children" in imapNode) {
          res.children = imapNode.children.map(converter);
        }
        return res;
      }
      this.treeData = mailboxes.children.map(converter);
    });
*/
  }

  ngOnDestroy() {
/*
    this.subscription.unsubscribe();
*/
  }

  onSelectFolders(event) {
    let selectedFolder = event.node
  }
}
