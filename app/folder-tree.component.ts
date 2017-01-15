import { Component,
         OnInit, OnDestroy,
         Input, Output,
         EventEmitter } from '@angular/core';

import { Subscription } from 'rxjs';

import { TreeNode } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder-item',
  template: `
    {{ imapNode.name }}
    <button pButton (click)="imapClientService.updateMailbox(imapNode.path)"
            [disabled]="!imapClientService.isLoggedIn()"
            icon="fa-refresh" ></button>
  `
})
export class FolderItemComponent {
  @Input() imapNode: any

  constructor(
    private imapClientService: ImapClientService
  ) {}
}

@Component({
  moduleId: module.id,
  selector: 'folder-tree',
  templateUrl: 'folder-tree.component.html'
})
export class FolderTreeComponent implements OnInit, OnDestroy {
  treeData: TreeNode[] = [];
  subscription: Subscription;

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
