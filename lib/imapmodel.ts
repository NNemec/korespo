import { Observable } from 'rxjs';

import { Moment } from 'moment';

export interface Address {
  readonly name: string;
  readonly addr: string;

  readonly countFilteredMessages: Observable<Number>;     // ignoring Address filter
  readonly countFilteredMessagesFrom: Observable<Number>; // ignoring Address filter
  readonly countFilteredMessagesTo: Observable<Number>;   // ignoring Address filter

  filterSelectedFrom: boolean;
  filterSelectedTo: boolean;
};

export interface Folder {
  readonly name: string;
  readonly children: Folder[];

  readonly countFilteredMessages: Observable<Number>;     // ignoring Folder filter

  filterSelected: boolean;
};

export interface Flag {
  readonly name: string;

  filterActive: boolean;
  invertFilter: boolean;
}

export interface Message {
  readonly subject: string;
  readonly from: Address[];
  readonly to: Address[];
  readonly date: Moment;

  readonly folder: Folder;
  readonly flags: Set<Flag>;
};

export interface Model {
  readonly folders: Observable<Folder>;
  readonly addresses: Observable<Address[]>;
  readonly flags: Observable<Map<string,Flag>>;

  readonly filteredDates: Observable<Moment[]>;           // ignoring Date filter

  filterStartDate: Moment;
  filterEndDate: Moment;

  readonly filteredMessages: Observable<Message[]>;
};

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

import { ImapCache } from './imapcache';

class AddressImpl implements Address{
  readonly name: string;
  readonly addr: string;

  readonly countFilteredMessages: Observable<Number>;     // ignoring Address filter
  readonly countFilteredMessagesFrom: Observable<Number>; // ignoring Address filter
  readonly countFilteredMessagesTo: Observable<Number>;   // ignoring Address filter

  filterSelectedFrom: boolean;
  filterSelectedTo: boolean;
};

class FolderImpl implements Folder {
  readonly name: string;
  readonly children: Folder[];

  readonly countFilteredMessages: Observable<Number>;     // ignoring Folder filter

  filterSelected: boolean;
};

class FlagImpl implements Flag {
  readonly name: string;

  filterActive: boolean;
  invertFilter: boolean;
}

class MessageImpl implements Message {
  readonly subject: string;
  readonly from: Address[];
  readonly to: Address[];
  readonly date: Moment;

  readonly folder: Folder;
  readonly flags: Set<Flag>;
};

class ModelImpl implements Model {
  readonly folders: Observable<FolderImpl>;
  readonly addresses: Observable<Address[]>;
  readonly flags: Observable<Map<string,Flag>>;

  readonly filteredDates: Observable<Moment[]>;           // ignoring Date filter

  filterStartDate: Moment;
  filterEndDate: Moment;

  readonly filteredMessages: Observable<Message[]>;

  constructor(private imapCache: ImapCache) {

  }
};

export function createModel(imapCache: ImapCache): Model {
  return new ModelImpl(imapCache);
}
