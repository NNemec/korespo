import { Injectable, NgZone } from '@angular/core';

import { Observable } from 'rxjs';

import * as Imap from '../lib/imapcache';

@Injectable()
export class ImapClientService {
  private imapCache = new Imap.ImapCache();

  constructor(private ngZone: NgZone) {
  }

  isOpen(): boolean {
    return this.imapCache.isOpen();
  }

  close(): void {
    this.imapCache.close();
  }

  // PouchCache change notification do not run inside ngZone. Need this wrapper in between
  ngZoneWrap<T>(obs: Observable<T>): Observable<T> {
    return new Observable<T>((observer)=>{
      let subscription = obs.subscribe((val)=>{
        this.ngZone.run(()=>observer.next(val));
      })
      return ()=>subscription.unsubscribe();
    });
  }

  get mailboxTree(): Observable<Imap.MailboxTree> {
    return this.ngZoneWrap(this.imapCache.mailboxTree);
  }

  get account(): Observable<Imap.Account> {
    return this.ngZoneWrap(this.imapCache.account);
  }

  get envelopes(): Observable<Imap.MsgSummary[]> {
    return this.ngZoneWrap(this.imapCache.filteredMessages);
  }

  get contacts(): Observable<Imap.Contact[]> {
    return this.ngZoneWrap(this.imapCache.contacts);
  }

  filterFolders(mailboxTree: Imap.Mailbox[]) {
    this.imapCache.filterMailboxes = mailboxTree;
  }

  filterContacts(contacts: Imap.Contact[]) {
    this.imapCache.filterContacts = contacts;
  }

  countMessagesPerMailbox(mbx: Imap.Mailbox): Observable<number> {
    return this.ngZoneWrap(this.imapCache.countMsgsPerMailbox(mbx));
  }

  isLoggedIn(): boolean {
    return this.imapCache.isLoggedIn();
  }

  login(account: Imap.Account): Promise<any> {
    return this.imapCache.login(account);
  }

  logout(): void {
    return this.imapCache.logout();
  }

  updateMailboxes(): Promise<any> {
    return this.imapCache.updateMailboxes();
  }

  updateMailbox(mailbox: Imap.Mailbox): Promise<void> {
    return this.imapCache.updateMailbox(mailbox);
  }

  updateAll(): Promise<void> {
    return this.imapCache.updateAll();
  }
}
