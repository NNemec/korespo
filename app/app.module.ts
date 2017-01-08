import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';

import { InputTextModule } from 'primeng/primeng';

import { AppComponent }        from './app.component';
import { AccountComponent } from './account.component';
import { FolderComponent }   from './folder.component';

import { ImapClientService } from './imapclient.service';

@NgModule({
  imports:      [
    BrowserModule,
    FormsModule,

    InputTextModule,
  ],
  declarations: [
    AppComponent,
    AccountComponent,
    FolderComponent,
  ],
  providers:    [
    ImapClientService,
  ],
  bootstrap:    [ AppComponent ],
})
export class AppModule { }
