import { Observable } from 'rxjs';

import { Moment } from 'moment';

interface Address {
  readonly name: string;
  readonly addr: string;

  readonly countFilteredMessages: Observable<Number>;     // ignoring Address filter
  readonly countFilteredMessagesFrom: Observable<Number>; // ignoring Address filter
  readonly countFilteredMessagesTo: Observable<Number>;   // ignoring Address filter

  filterSelectedFrom: boolean;
  filterSelectedTo: boolean;
};

interface Folder {
  name: string;
  children: Folder[];

  readonly countFilteredMessages: Observable<Number>;     // ignoring Folder filter

  filterSelected: boolean;
};

interface Message {
  readonly subject: string;
  readonly from: Address[];
  readonly to: Address[];
  readonly date: Moment;

  readonly folder: Folder;
};

interface ImapModel {
  readonly folders: Observable<Folder>;
  readonly addresses: Observable<Address[]>;

  readonly filteredDates: Observable<Moment[]>;           // ignoring Date filter

  filterStartDate: Moment;
  filterEndDate: Moment;

  readonly filteredMessages: Observable<Message[]>;
};