import { Injectable, NgZone } from '@angular/core';

import { Observable } from 'rxjs';

import { ImapCache, AccountData } from '../lib/imapcache';

@Injectable()
export class ImapClientService {
  private imapCache = new ImapCache();

  constructor(private ngZone: NgZone) {
  }

  accountData(): AccountData {
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

  observe_mailboxes(): Observable<any> {
    return this.ngZoneWrap(this.imapCache.observe_mailboxes());
  }

  observe_mailbox(path: string): Observable<any> {
    return this.ngZoneWrap(this.imapCache.observe_mailbox(path));
  }

  observe_messages(path: string): Observable<any> {
    return this.ngZoneWrap(this.imapCache.observe_messages(path));
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

  updateMailbox(path: string): void {
    return this.imapCache.updateMailbox(path);
  }

  updateAll(): void {
    return this.imapCache.updateAll();
  }
}
