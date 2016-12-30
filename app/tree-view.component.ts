import {Component, Input} from '@angular/core';

@Component({
  moduleId: module.id,
  selector: 'tree-view',
  templateUrl: './tree-view.component.html'
})
export class TreeViewComponent {
  @Input() folders: any[];
}
