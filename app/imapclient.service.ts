import { Injectable, NgZone } from '@angular/core';

import { Observable } from 'rxjs';

import * as Imap from '../lib/imapcache';

@Injectable()
export class ImapClientService {
  private imapCache = new Imap.ImapCache();

  constructor(private ngZone: NgZone) {
  }

  accountData(): Imap.AccountData {
    return this.imapCache.accountData();
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

  get mailboxes(): Observable<Imap.Mailboxes> {
    return this.ngZoneWrap(this.imapCache.mailboxes);
  }

  get envelopes(): Observable<Imap.Envelope[]> {
    return this.ngZoneWrap(this.imapCache.filteredMessages);
  }

  get contacts(): Observable<Imap.Contact[]> {
    return this.ngZoneWrap(this.imapCache.contacts);
  }

  filterFolders(mailboxes: Imap.Mailbox[]) {
    this.imapCache.filterMailboxes = mailboxes;
  }

  filterContacts(contacts: Imap.Contact[]) {
//    this.imapCache.filterContacts = contacts;
  }

  countMessagesPerMailbox(mbx: Imap.Mailbox): Observable<number> {
    return this.ngZoneWrap(this.imapCache.countMsgsPerMailbox(mbx));
  }

  isLoggedIn(): boolean {
    return this.imapCache.isLoggedIn();
  }

  login(): Promise<any> {
    return this.imapCache.login();
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
