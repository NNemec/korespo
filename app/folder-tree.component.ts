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
    <span style="float:left">{{ prefix }} {{ mailbox.name }} {{ countMessages }}</span>
    <span style="float:right">
    <button pButton (click)="imapClientService.updateMailbox(mailbox)"
            [disabled]="!imapClientService.isLoggedIn()"
            icon="fa-refresh"
            style="font-size:0.6em"></button>
    </span>
  `,
})
export class FolderItemComponent implements OnInit, OnDestroy {
  @Input() mailbox: Imap.Mailbox;

  prefix = "";
  countMessages = 0;

  private subscription: Subscription;

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
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

    this.subscription = this.imapClientService.countMessagesPerMailbox(this.mailbox)
    .subscribe(count=>{
      this.countMessages=count;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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

  private _selectedFolders: TreeNode[] = [];
  get selectedFolders(): TreeNode[] {
    return this._selectedFolders;
  }
  set selectedFolders(val: TreeNode[]) {
    this._selectedFolders = val;
    this.imapClientService.filterFolders(val.map(node=>node.data as Imap.Mailbox));
  }

  constructor(
    private imapClientService: ImapClientService
  ) {}

  ngOnInit() {
    this.subscription = this.imapClientService.mailboxTree.subscribe((mailboxTree:Imap.MailboxTree)=>{
      let converter = (mailbox:Imap.Mailbox)=>{
        let res: TreeNode = {data:mailbox}
        if("children" in mailbox) {
          res.children = mailbox.children.map(converter);
        }
        return res;
      }
      this.treeData = mailboxTree.children.map(converter);
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
