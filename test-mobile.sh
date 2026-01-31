#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║        📱 Expo Go ile Mobil Test - Quick Start 📱             ║
# ╚══════════════════════════════════════════════════════════════╝

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        📱 Çiftlik Takip - Mobil Test Rehberi 📱              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📲 Expo Go ile Test Etmek İçin:"
echo ""
echo "  1. Telefonunuza 'Expo Go' uygulamasını yükleyin"
echo "     • Android: Play Store'dan 'Expo Go' arayın"
echo "     • iOS: App Store'dan 'Expo Go' arayın"
echo ""
echo "  2. QR kodu tarayın:"
echo "     • Android: Expo Go uygulamasını açın → 'Scan QR Code'"
echo "     • iOS: Kamera uygulamasını açın ve QR kodu tarayın"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd /app/frontend

# Get the tunnel URL from expo
echo "📡 Expo Tunnel URL'leri:"
echo ""

# Check if expo is running
if curl -s "http://localhost:3000" > /dev/null 2>&1; then
    echo "  🌐 Web Preview: http://localhost:3000"
    echo ""
    
    # Try to get QR code info from expo
    echo "  📱 Mobil için Expo Tunnel aktif."
    echo "     Expo Go uygulamasında QR kodu tarayın."
    echo ""
else
    echo "  ⚠️ Expo çalışmıyor. Başlatmak için:"
    echo "     cd /app/frontend && npx expo start"
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🔧 APK Build için:"
echo "   ./build.sh"
echo ""
