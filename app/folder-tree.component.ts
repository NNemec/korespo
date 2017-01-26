import { Component,
         OnInit, OnDestroy, OnChanges,
         SimpleChanges,
         Input, Output,
         EventEmitter } from '@angular/core';

import { Subscription } from 'rxjs';

import { TreeNode } from 'primeng/primeng';

import { ImapClientService } from './imapclient.service';

import * as Imap from '../lib/imapcache';

@Component({
  moduleId: module.id,
  selector: 'folder-item',
  template: `
    <span style="float:left">{{ prefix }}{{ mailbox.name }}</span>
    <span style="float:right">
    <button pButton (click)="imapClientService.updateMailbox(mailbox)"
            [disabled]="!imapClientService.isLoggedIn()"
            icon="fa-refresh"
            style="font-size:0.6em"></button>
    </span>
  `,
})
export class FolderItemComponent implements OnChanges {
  @Input() mailbox: Imap.Mailbox;

  prefix = ""

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if("mailbox" in changes) {
      this.prefix = ""

      let listFlags = this.mailbox.flags
      if(this.mailbox.specialUse)
        listFlags = listFlags.concat(this.mailbox.specialUse)
      let flags = new Set(listFlags)

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

  @Output() mailboxSelected = new EventEmitter<Imap.Mailbox>();

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.observeMailboxes().subscribe((mailboxes:Imap.Mailboxes)=>{
      let converter = (mailbox:Imap.Mailbox)=>{
        let res: TreeNode = {data:mailbox}
        if("children" in mailbox) {
          res.children = mailbox.children.map(converter);
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
    let selectedMailbox = event.node.data as Imap.Mailbox;
    console.log("Selected: " + selectedMailbox.path)
    this.mailboxSelected.emit(selectedMailbox);
  }
}
