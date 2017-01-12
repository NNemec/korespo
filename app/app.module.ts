import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { FlexLayoutModule } from "@angular/flex-layout";

import { ButtonModule }      from 'primeng/primeng';
import { DataTableModule }   from 'primeng/primeng';
import { DialogModule }      from 'primeng/primeng';
import { InputTextModule }   from 'primeng/primeng';
import { SharedModule }      from 'primeng/primeng';
import { TreeModule }        from 'primeng/primeng';

import { AppComponent }      from './app.component';
import { FolderTreeComponent }  from './folder-tree.component';
import { MessageListComponent }  from './message-list.component';

import { ImapClientService } from './imapclient.service';

@NgModule({
  imports:      [
    BrowserModule,
    FormsModule,
    FlexLayoutModule.forRoot(),

    ButtonModule,
    DataTableModule,
    DialogModule,
    InputTextModule,
    SharedModule,
    TreeModule,
  ],
  declarations: [
    AppComponent,
    FolderTreeComponent,
    MessageListComponent,
  ],
  providers:    [
    ImapClientService,
  ],
  bootstrap:    [ AppComponent ],
})
export class AppModule { }
