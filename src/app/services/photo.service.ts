import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Directory } from '@capacitor/filesystem/dist/esm/definitions';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';

export interface UserPhoto {
  filepath: string;
  webviewPath: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  public async addNewToGallery(): Promise<void> {
    // take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);
    console.log(JSON.stringify(savedImageFile));
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  public async deletePicture(photo: UserPhoto, position: number) {
    this.photos.splice(position, 1);

    // update photos array cache by overwriting the existing photo array
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });

    // delete photo file from filesystem
    const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data,
    });
  }

  public async loadSaved() {
    // retrieve cached photo array data
    const photoList = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = photoList.value ? JSON.parse(photoList.value) : [];

    // web platform only: load the photo as base64 data
    if (!this.platform.is('hybrid')) {
      // display the photo by reading into base64 format
      for (let photo of this.photos) {
        // read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });

        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  private async savePicture(photo: Photo): Promise<UserPhoto> {
    // convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);

    // write file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    if (this.platform.is('hybrid')) {
      // display the new image by rewriting the 'file://' path to HTTP
      // details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      // use webPath to display the new image instead of base64 since it's already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath!,
      };
    }
  }

  private async readAsBase64(photo: Photo): Promise<string> {
    // hybrid will detect Cordova or Capacitor
    if (this.platform.is('hybrid')) {
      // read the file into base64 format
      const file = await Filesystem.readFile({
        path: photo.path!,
      });

      return file.data;
    } else {
      // fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();

      return (await this.convertBlobToBase64(blob)) as string;
    }
  }

  private convertBlobToBase64(blob: Blob): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }
}
