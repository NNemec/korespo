import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';

import { ButtonModule }      from 'primeng/primeng';
import { DialogModule }      from 'primeng/primeng';
import { InputTextModule }   from 'primeng/primeng';
import { SharedModule }      from 'primeng/primeng';
import { TreeTableModule }   from 'primeng/primeng';

import { AppComponent }      from './app.component';
import { AccountComponent }  from './account.component';

import { ImapClientService } from './imapclient.service';

@NgModule({
  imports:      [
    BrowserModule,
    FormsModule,

    ButtonModule,
    DialogModule,
    InputTextModule,
    SharedModule,
    TreeTableModule,
  ],
  declarations: [
    AppComponent,
    AccountComponent,
  ],
  providers:    [
    ImapClientService,
  ],
  bootstrap:    [ AppComponent ],
})
export class AppModule { }
