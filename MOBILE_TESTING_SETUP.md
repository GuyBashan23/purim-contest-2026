# 📱 Mobile Testing Setup - Local Network Access

## ✅ Configuration Updated

### Change Made
**File:** `package.json`
**Script:** `dev`
**Before:** `"dev": "next dev"`
**After:** `"dev": "next dev -H 0.0.0.0"`

## 🎯 What This Does

The `-H 0.0.0.0` flag tells Next.js to:
- Bind to all network interfaces (not just localhost)
- Expose the dev server on your local network IP
- Allow devices on the same Wi-Fi to access the app

## 📱 How to Use

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Find Your Local IP Address

**On macOS:**
```bash
ipconfig getifaddr en0
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig
# Look for IPv4 Address under your Wi-Fi adapter
```

**On Linux:**
```bash
hostname -I
# or
ip addr show
```

### 3. Access from Mobile

1. Make sure your phone is on the **same Wi-Fi network**
2. Open browser on phone
3. Navigate to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

### 4. Next.js Will Show Network URLs

When you run `npm run dev`, Next.js will display:
```
- Local:        http://localhost:3000
- Network:      http://192.168.1.100:3000
```

Use the **Network** URL on your mobile device.

## 🔒 Security Note

- This exposes your dev server to your local network only
- Only devices on the same Wi-Fi can access it
- Safe for development/testing
- **Do NOT use this in production**

## 🐛 Troubleshooting

### Can't Access from Phone?

1. **Check Firewall:**
   - macOS: System Settings → Firewall (may need to allow Node.js)
   - Windows: Windows Defender Firewall (may need to allow port 3000)

2. **Verify Same Network:**
   - Phone and computer must be on the same Wi-Fi
   - Check IP addresses are in the same range (e.g., both 192.168.1.x)

3. **Check Port:**
   - Default is 3000
   - If port is in use, Next.js will use 3001, 3002, etc.

4. **Try IP Directly:**
   - Use the exact IP shown in the terminal
   - Include the port number: `http://IP:PORT`

## ✅ Benefits

- ✅ Test on real mobile devices
- ✅ Test touch interactions
- ✅ Test mobile Safari/Chrome
- ✅ Test device-specific features (shake, camera, etc.)
- ✅ See actual performance on mobile hardware

---

**Status:** ✅ Configured
**Ready for:** Mobile testing on local network
