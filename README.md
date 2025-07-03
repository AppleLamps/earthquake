# Live Earthquake Monitor

A fully serverless real-time earthquake monitoring website that fetches live earthquake data from the USGS GeoJSON feed. Built with vanilla HTML, CSS, and JavaScript for optimal performance and easy deployment.

## Features

- **Real-time Data**: Fetches earthquake data from USGS every 5 minutes
- **Browser Notifications**: Push notifications for significant earthquakes (magnitude 4.5+)
- **Interactive Filtering**: Filter by magnitude and sort by time or magnitude
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Professional UI**: Clean, modern interface with smooth animations
- **Offline Handling**: Gracefully handles network connectivity issues
- **Auto-refresh**: Automatically updates when page regains focus

## Live Demo

🌍 **[View Live Demo](https://your-vercel-app.vercel.app)**

## Screenshot

*Clean, professional interface displaying real-time earthquake data*

## Quick Start

### Local Development

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd earthquake-web
   ```

2. Serve the files using any static file server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have serve installed)
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

### Deploy to Vercel

1. **One-click deploy**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/earthquake-web)

2. **Manual deploy**:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

3. **GitHub Integration**:
   - Connect your GitHub repository to Vercel
   - Automatic deployments on every push to main branch

## Browser Notifications

To enable earthquake notifications:

1. Click the **"Enable Notifications"** button in the header
2. Allow notifications when prompted by your browser
3. You'll receive notifications for earthquakes with magnitude 4.5 or higher
4. Notifications will automatically appear for new significant earthquakes

### Notification Features

- **Smart filtering**: Only notifies for magnitude 4.5+ earthquakes
- **Click to focus**: Click notifications to jump to the earthquake in the list
- **Auto-close**: Non-critical notifications auto-close after 10 seconds
- **Persistent for major events**: Magnitude 5.0+ notifications require manual dismissal

## Data Source

This application uses the **USGS Earthquake Hazards Program** real-time GeoJSON feed:
- **API Endpoint**: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson`
- **Update Frequency**: Every minute (we poll every 5 minutes)
- **Data Coverage**: All earthquakes from the past hour
- **Global Coverage**: Worldwide earthquake monitoring

## Technical Details

### Architecture
- **Frontend Only**: No backend required - fully serverless
- **Vanilla JavaScript**: No frameworks or dependencies
- **Modern CSS**: CSS Grid, Flexbox, and CSS Variables
- **Progressive Enhancement**: Works without JavaScript for basic viewing

### Performance
- **Lightweight**: Total bundle size < 50KB
- **Fast Loading**: Optimized for mobile networks
- **Efficient Updates**: Only updates when data changes
- **Responsive Images**: SVG icons for crisp display at any size

### Browser Support
- **Modern Browsers**: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+
- **Notifications**: Requires browsers with Notification API support
- **Mobile**: Full support for iOS Safari and Chrome Mobile

## Configuration

### Notification Thresholds
```javascript
// In script.js, modify these values:
const significantThreshold = 4.5; // Minimum magnitude for notifications
const updateInterval = 5 * 60 * 1000; // Update frequency (5 minutes)
```

### Styling Customization
```css
/* In styles.css, modify CSS variables: */
:root {
    --primary-color: #2c3e50;
    --secondary-color: #3498db;
    --accent-color: #e74c3c;
    /* ... other variables */
}
```

## File Structure

```
earthquake-web/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

## API Integration

The app integrates with the USGS Earthquake API:

```javascript
// Example API response structure
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "mag": 2.5,
        "place": "10km NE of City, State",
        "time": 1635789123000,
        "url": "https://earthquake.usgs.gov/earthquakes/eventpage/...",
        "title": "M 2.5 - 10km NE of City, State"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.123, 37.456, 5.0]
      }
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Notifications Not Working
- Ensure your browser supports the Notification API
- Check that notifications aren't blocked in browser settings
- Verify you clicked "Allow" when prompted for permission

### Data Not Loading
- Check your internet connection
- Verify the USGS API is accessible from your location
- Look for CORS issues in browser developer tools

### Mobile Issues
- Ensure you're using a modern mobile browser
- Check that JavaScript is enabled
- Try refreshing the page

## Security

The application includes several security measures:
- Content Security Policy headers
- XSS protection
- No external dependencies or CDNs
- HTTPS enforcement on Vercel

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- **USGS Earthquake Hazards Program** for providing free, real-time earthquake data
- **Vercel** for excellent static site hosting
- **Contributors** who help improve this project

---

**Built with ❤️ for earthquake monitoring and public safety** 