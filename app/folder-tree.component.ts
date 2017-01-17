import { Component,
         OnInit, OnDestroy, OnChanges,
         SimpleChanges,
         Input, Output,
         EventEmitter } from '@angular/core';

import { Subscription } from 'rxjs';

import { TreeNode } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

@Component({
  moduleId: module.id,
  selector: 'folder-item',
  template: `
    <span style="float:left" [pTooltip]="mailbox | json">{{ prefix }}{{ imapNode.name }} {{ mailbox?.exists }}</span>
    <span style="float:right">
    <button pButton (click)="imapClientService.updateMailbox(imapNode.path)"
            [disabled]="!imapClientService.isLoggedIn()"
            icon="fa-refresh"
            style="font-size:0.6em"></button>
    </span>
  `,
})
export class FolderItemComponent implements OnInit, OnDestroy, OnChanges {
  @Input() imapNode: any

  subscription: Subscription;
  mailbox: any

  prefix = ""

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.observe_mailbox(this.imapNode.path).subscribe((mailbox)=>{
      this.mailbox = mailbox;
    });
  }

  ngOnDestroy() {
    if(this.subscription)
      this.subscription.unsubscribe();
    this.subscription = undefined
  }

  ngOnChanges(changes: SimpleChanges) {
    if("imapNode" in changes) {
      this.ngOnDestroy()
      this.ngOnInit()

      this.prefix = ""

      let flags = this.imapNode.flags
      if(this.imapNode.specialUse)
        flags = flags.concat(this.imapNode.specialUse)
      flags = new Set(flags)

      flags.forEach((f)=>{
        switch(f) {
          case "\\HasNoChildren": break;
          case "\\HasChildren":   break;
          case "\\NoInferiors":   break;
          case "\\All":           this.prefix += "🌍 "; break;
          case "\\NoSelect":      this.prefix += "🚫 "; break;
          case "\\Trash":         this.prefix += "🗑 "; break;

          case "\\Archive":       this.prefix += "📦 "; break;
          case "\\Drafts":        this.prefix += "📝 "; break;
          case "\\Sent":          this.prefix += "💨 "; break;
          case "\\Junk":          this.prefix += "💩 "; break;

          default: this.prefix += f + " ";
        }
      });
      if(this.prefix == "")
        this.prefix = "📁 "
    }
  }
}

@Component({
  moduleId: module.id,
  selector: 'folder-tree',
  templateUrl: 'folder-tree.component.html',
  styles: [`
    * >>> .ui-treenode-content {
      display: flex;
    }
    * >>> .ui-treenode-leaf-icon {
      flex: none;
    }
    * >>> .ui-treenode-label {
      flex: auto;
    }
  `]
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
