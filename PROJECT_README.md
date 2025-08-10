# Receipt Scanner - AI-Powered Batch Capture

A Progressive Web App (PWA) for rapid receipt scanning using YOLO object detection, optimized for iPad. Automatically detects and captures receipts using the device camera with AI-powered detection running entirely in the browser.

## Features

- **Real-time AI Detection**: Uses Hugging Face Transformers.js with YOLO models
- **Auto-Capture Mode**: Automatically captures when receipt is detected and stable
- **Batch Processing**: Rapidly capture hundreds of receipts
- **100% Browser-Based**: No server required, runs entirely on device
- **Offline Support**: Works without internet after initial load
- **Gallery Management**: View, select, and export captured receipts
- **PWA Features**: Install as app, fullscreen mode, offline capability

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Run development server**:
```bash
npm run dev
```

3. **Access on iPad**:
- Open the HTTPS URL shown in terminal on your iPad
- Grant camera permissions when prompted
- For best experience, add to home screen as PWA

## Usage

### Auto-Capture Mode (Default)
1. Point camera at receipt
2. Green box appears when receipt detected
3. Automatic capture when receipt is stable
4. Sound/vibration confirms capture
5. Continue with next receipt

### Manual Mode
1. Tap "AUTO" button to switch to "MANUAL"
2. Tap capture button when ready
3. Useful for difficult lighting or specific timing

### Gallery
- Tap gallery icon to view captured receipts
- Select multiple for batch export
- Swipe through full-size images
- Export as individual images or batch

### Settings
- **Detection Confidence**: Adjust sensitivity (default 85%)
- **Stability Frames**: How steady before capture (default 5)
- **Model Selection**: Choose between speed and accuracy
- **Sound/Vibration**: Toggle feedback options

## Models

Three models available:
- **YOLOS Tiny**: Fast, good for real-time (default)
- **YOLOS Small**: Balanced performance
- **DETR ResNet-50**: Most accurate, slower

## Performance Tips

- Ensure good lighting
- Hold device steady
- Keep receipts flat
- Avoid shadows/glare
- Use landscape orientation for wider receipts

## Browser Requirements

- iOS Safari 15+ (iPad)
- Chrome/Edge 90+ (Desktop)
- Camera access permission
- HTTPS connection required

## Build for Production

```bash
npm run build
npm run preview
```

## Technical Stack

- **Frontend**: Vanilla JavaScript ES6+
- **AI Models**: Transformers.js (Hugging Face)
- **Object Detection**: YOLO/DETR models
- **Storage**: IndexedDB
- **Build Tool**: Vite
- **PWA**: Service Worker + Web App Manifest

## Data Privacy

- All processing happens on-device
- No data sent to servers
- Images stored locally in browser
- Export/delete anytime

## Troubleshooting

### Camera not working
- Check camera permissions in Settings
- Ensure HTTPS connection
- Close other apps using camera

### Slow detection
- Switch to YOLOS Tiny model
- Reduce confidence threshold
- Close background tabs

### Storage full
- Export receipts to free space
- Clear old sessions
- Check iPad storage settings