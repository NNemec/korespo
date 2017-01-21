import { Injectable, NgZone } from '@angular/core';

import { Observable } from 'rxjs';

import { ImapClient, AccountData } from '../lib/imapclient';

@Injectable()
export class ImapClientService {
  private imapClient = new ImapClient();

  constructor(private ngZone: NgZone) {
  }

  accountData(): AccountData {
    return this.imapClient.accountData();
  }

  isOpen(): boolean {
    return this.imapClient.isOpen();
  }

  close(): void {
    this.imapClient.close();
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
    return this.ngZoneWrap(this.imapClient.observe_mailboxes());
  }

  observe_mailbox(path: string): Observable<any> {
    return this.ngZoneWrap(this.imapClient.observe_mailbox(path));
  }

  observe_messages(path: string): Observable<any> {
    return this.ngZoneWrap(this.imapClient.observe_messages(path));
  }

  isLoggedIn(): boolean {
    return this.imapClient.isLoggedIn();
  }

  login(): Promise<any> {
    return this.imapClient.login();
  }

  logout(): void {
    return this.imapClient.logout();
  }

  updateMailboxes(): Promise<any> {
    return this.imapClient.updateMailboxes();
  }

  updateMailbox(path: string): void {
    return this.imapClient.updateMailbox(path);
  }

  updateAll(): void {
    return this.imapClient.updateAll();
  }
}
