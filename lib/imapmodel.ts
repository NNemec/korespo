import { Observable } from 'rxjs';

import { Moment } from 'moment';

interface Address {
  readonly name: string;
  readonly addr: string;

  readonly countFilteredMessages: Observable<Number>;
  readonly countFilteredMessagesTo: Observable<Number>;
  readonly countFilteredMessagesFrom: Observable<Number>;
};

interface Folder {
  name: string;
  children: Folder[];

  readonly countFilteredMessages: Observable<Number>;
}

interface Message {
  readonly subject: string;
  readonly from: Address[];
  readonly to: Address[];
  readonly date: Moment;
}

interface ImapModel {
  readonly folders: Observable<Folder>;
  readonly addresses: Observable<Address[]>;

  filterAddresses: Address[];
  filterFolders: Folder[];

  readonly filteredDates: Observable<Moment[]>; // ignoring filtered(Start|End)Date

  filterStartDate: Moment;
  filterEndDate: Moment;

  readonly filteredMessages: Observable<Message[]>;
}