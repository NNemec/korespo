import { Component, OnInit, OnDestroy } from '@angular/core';

import { TreeNode } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'account',
  templateUrl: 'account.component.html'
})
export class AccountComponent implements OnInit, OnDestroy {
  treeData: TreeNode[] = [];
  subscription: any;

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.mailboxes().subscribe((mailboxes)=>{
      let converter = (imapNode)=>{
        let res: TreeNode = {data:imapNode}
        if("children" in imapNode) {
          res.children = imapNode.children.map(converter);
        }
        return res;
      }
      this.treeData = mailboxes.children.map(converter);
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
