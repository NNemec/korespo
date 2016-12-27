import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';

import { AppComponent }   from './app.component';

import { ImapClientService } from './imapclient.service';

@NgModule({
  imports:      [
    BrowserModule,
    FormsModule,
  ],
  declarations: [
    AppComponent,
  ],
  providers:    [
    ImapClientService,
  ],
  bootstrap:    [ AppComponent ],
})
export class AppModule { }
