# OtakuStream - Web Nonton Anime Otakudesu Bebas Iklan & Redirect

Aplikasi web khusus untuk streaming anime dari Otakudesu dengan fitur pemutar video bersih (**Zero Ads**, **Anti-Popup**, dan **Anti-Redirect**) yang dirancang khusus untuk layar HP Android dan PC.

---

## 🌟 Fitur Utama
1. **Zero Ads & Anti-Redirect**:
   - Pemutar video menggunakan Native HTML5 Player (`/api/video-stream`) yang mengambil aliran video langsung tanpa skrip iklan atau overlay transparan.
   - Dilengkapi fallback Sandboxed Iframe Player yang memblokir `allow-popups` dan `allow-top-navigation` agar tidak ada tab baru yang bisa terbuka saat layar diklik.
2. **Koleksi Lengkap Terhubung ke Otakudesu**:
   - Fitur pencarian anime apa saja yang ada di Otakudesu.
   - Shortcut langsung untuk **Fumetsu no Anata e (Episode 1 – 20)**.
   - Daftar anime Ongoing dan Completed update otomatis.
3. **Desain Mobile-First untuk Android**:
   - Tampilan Dark Mode elegan dan ringan.
   - Tombol navigasi episode cepat: *Eps 1* s/d *Eps 20*, tombol *Next Episode*, dan *Prev Episode*.
   - Menyimpan riwayat episode yang sudah ditonton (*Watched* badge).

---

## 🚀 Cara 1: Menjalankan di Komputer & Membuka di HP Android (Jaringan Wi-Fi)

Jika komputer/laptop dan HP Android berada dalam 1 jaringan Wi-Fi:

1. Buka terminal/PowerShell di folder ini:
   ```bash
   cd "D:\WEB ANIMASI"
   ```
2. Jalankan server:
   ```bash
   npm start
   ```
3. Cek alamat IP lokal komputer lu di PowerShell:
   ```bash
   ipconfig
   ```
   *(Cari baris `IPv4 Address`, contoh: `192.168.1.15`)*.
4. Buka browser (Chrome / Brave) di HP Android lu, lalu ketik:
   ```text
   http://192.168.1.15:3000
   ```
   *(Ganti `192.168.1.15` dengan alamat IP komputer lu)*.

---

## ☁️ Cara 2: Deploy Online Gratis ke Vercel (Bisa Dibuka di HP dari Mana Saja)

Agar lu punya link website sendiri (contoh: `https://anime-gue.vercel.app`) yang bisa dibuka di HP Android tanpa perlu menyalakan laptop:

### Langkah Mudah via GitHub & Vercel:
1. Buat repository baru di [GitHub](https://github.com) (misal: `web-animasi`).
2. Masukkan folder `D:\WEB ANIMASI` ke git dan upload ke GitHub:
   ```bash
   cd "D:\WEB ANIMASI"
   git init
   git add .
   git commit -m "Initial OtakuStream"
   git branch -M main
   git remote add origin https://github.com/<USERNAME-LU>/web-animasi.git
   git push -u origin main
   ```
3. Buka [Vercel](https://vercel.com) dan login menggunakan akun GitHub.
4. Klik **Add New Project** > pilih repository `web-animasi` > klik **Deploy**.
5. Selesai! Dalam 1 menit, Vercel akan memberikan link web publik yang bisa lu buka langsung di HP Android.
