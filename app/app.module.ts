import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';

import { ButtonModule }      from 'primeng/primeng';
import { DataTableModule }   from 'primeng/primeng';
import { DialogModule }      from 'primeng/primeng';
import { InputTextModule }   from 'primeng/primeng';
import { MultiSelectModule } from 'primeng/primeng';
import { SharedModule }      from 'primeng/primeng';
import { SliderModule }      from 'primeng/primeng';
import { ToolbarModule }     from 'primeng/primeng';
import { TooltipModule }     from 'primeng/primeng';
import { TreeModule }        from 'primeng/primeng';

import { AppComponent }      from './app.component';
import { FolderItemComponent,
         FolderTreeComponent }  from './folder-tree.component';
import { AddressesViewComponent,
         DateViewComponent,
         MessageListInternalComponent,
         MessageListComponent }  from './message-list.component';

import { ImapClientService } from './imapclient.service';

@NgModule({
  imports:      [
    BrowserModule,
    FormsModule,

    ButtonModule,
    DataTableModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    SharedModule,
    SliderModule,
    ToolbarModule,
    TooltipModule,
    TreeModule,
  ],
  declarations: [
    AppComponent,

    FolderItemComponent,
    FolderTreeComponent,

    AddressesViewComponent,
    DateViewComponent,
    MessageListInternalComponent,
    MessageListComponent,
  ],
  providers:    [
    ImapClientService,
  ],
  bootstrap:    [ AppComponent ],
})
export class AppModule { }
