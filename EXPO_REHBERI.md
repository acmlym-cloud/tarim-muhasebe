# 📱 Çiftlik Takip - Expo Kullanım Rehberi

## 🎯 Expo Nedir?
Expo, React Native uygulamalarını kolayca geliştirmenizi, test etmenizi ve dağıtmanızı sağlayan bir platformdur.

---

## 📲 1. EXPO GO İLE TEST ETME (En Kolay Yöntem)

### Adım 1: Expo Go Uygulamasını İndirin
- **Android**: Google Play Store'dan "Expo Go" arayın ve yükleyin
- **iOS**: App Store'dan "Expo Go" arayın ve yükleyin

### Adım 2: QR Kodu Tarayın
1. Telefonunuzda Expo Go uygulamasını açın
2. "Scan QR Code" butonuna tıklayın
3. Bilgisayarınızdaki terminalde görünen QR kodu tarayın

### Adım 3: Uygulama Açılacak!
- Uygulama telefonunuzda açılacak
- Değişiklik yaptığınızda otomatik yenilenir

---

## 🔨 2. APK OLUŞTURMA (Kalıcı Kurulum)

### Yöntem A: EAS Build (Önerilen - Expo Sunucularında)

#### 1. Expo Hesabı Oluşturun
```
https://expo.dev/signup
```
Ücretsiz hesap oluşturun.

#### 2. EAS CLI Kurun
```bash
npm install -g eas-cli
```

#### 3. Giriş Yapın
```bash
eas login
```
Email ve şifrenizi girin.

#### 4. Projeyi Bağlayın
```bash
cd /app/frontend
eas init
```

#### 5. APK Build Edin
```bash
# APK (Doğrudan yüklenebilir)
eas build --platform android --profile preview

# AAB (Google Play için)
eas build --platform android --profile production
```

#### 6. APK'yı İndirin
Build tamamlandığında Expo size bir indirme linki verecek.
Bu APK'yı telefonunuza yükleyebilirsiniz.

---

### Yöntem B: Lokal Build (Android Studio Gerekli)

#### 1. Android Studio Kurun
https://developer.android.com/studio

#### 2. Native Proje Oluşturun
```bash
cd /app/frontend
npx expo prebuild --platform android
```

#### 3. APK Build Edin
```bash
cd android
./gradlew assembleRelease
```

#### 4. APK Konumu
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📋 3. HIZLI KOMUTLAR

```bash
# Expo'yu başlat
cd /app/frontend
npx expo start

# Tunnel ile başlat (farklı ağlarda test için)
npx expo start --tunnel

# Sadece Android için
npx expo start --android

# Sadece Web için
npx expo start --web

# Cache temizle ve başlat
npx expo start --clear
```

---

## 🌐 4. WEB'DE TEST

Web tarayıcısında test etmek için:
```bash
npx expo start --web
```
Tarayıcınızda http://localhost:3000 açılacak.

---

## 📦 5. BUILD PROFİLLERİ

### eas.json Dosyası:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"  // Doğrudan yüklenebilir APK
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"  // Google Play için AAB
      }
    }
  }
}
```

---

## ❓ 6. SORUN GİDERME

### "Metro bundler failed to start"
```bash
npx expo start --clear
```

### "Unable to resolve module"
```bash
rm -rf node_modules
yarn install
npx expo start --clear
```

### "Build failed"
```bash
# Cache temizle
eas build --platform android --profile preview --clear-cache
```

### QR kod taranamıyor
- Aynı WiFi ağında olduğunuzdan emin olun
- Tunnel modunu deneyin: `npx expo start --tunnel`

---

## 📱 7. TELEFONUNUZA APK YÜKLEME

### Android'de:
1. APK dosyasını telefonunuza aktarın (USB, email, cloud)
2. Dosya yöneticisinde APK'ya tıklayın
3. "Bilinmeyen kaynaklardan yüklemeye izin ver" seçeneğini açın
4. Yükle butonuna tıklayın

### Güvenlik Ayarı:
Ayarlar → Güvenlik → Bilinmeyen Kaynaklar → Açık

---

## 🚀 8. GOOGLE PLAY'E YÜKLEME

1. Google Play Console hesabı oluşturun ($25 tek seferlik)
2. AAB formatında build edin:
   ```bash
   eas build --platform android --profile production
   ```
3. Google Play Console'da yeni uygulama oluşturun
4. AAB dosyasını yükleyin
5. Uygulama bilgilerini doldurun
6. İncelemeye gönderin

---

## 📞 YARDIM

- Expo Dokümantasyon: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- Discord: https://chat.expo.dev

---

## ⚡ HIZLI BAŞLANGIÇ

```bash
# 1. Expo Go ile hemen test et
cd /app/frontend
npx expo start --tunnel

# 2. QR kodu telefonunla tara

# 3. Uygulaman açılacak! 🎉
```
