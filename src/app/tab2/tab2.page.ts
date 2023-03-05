import { Component, OnInit } from '@angular/core';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { PhotoService, UserPhoto } from '../services/photo.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})
export class Tab2Page implements OnInit {
  constructor(
    public photoService: PhotoService,
    public actionSheetController: ActionSheetController,
    public toastController: ToastController
  ) {}

  async ngOnInit(): Promise<void> {
    await this.photoService.loadSaved();
  }

  async addPhotoToGallery() {
    await this.photoService.addNewToGallery();
    this.presentToast('Photo added successfully');
  }

  async showActionSheet(photo: UserPhoto, position: number) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Photo',
      buttons: [
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash',
          handler: async () => {
            await this.photoService.deletePicture(photo, position);
            this.presentToast('Photo deleted successfully');
          },
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {},
        },
      ],
    });
    await actionSheet.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 1500,
      position: 'top',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel',
        },
      ],
    });

    await toast.present();
  }
}
