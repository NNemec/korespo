import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

import { TreeNode } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder-tree',
  templateUrl: 'folder-tree.component.html'
})
export class FolderTreeComponent implements OnInit, OnDestroy {
  treeData: TreeNode[] = [];
  subscription: any;

  selectedFolders: TreeNode[] = [];

  @Output() folderPathSelected = new EventEmitter<string>();

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.observe_mailboxes().subscribe((mailboxes)=>{
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

  onSelectFolder(event) {
    let selectedFolder = event.node
    console.log("Selected: " + selectedFolder.data.path)
    this.folderPathSelected.emit(selectedFolder.data.path);
  }
}
