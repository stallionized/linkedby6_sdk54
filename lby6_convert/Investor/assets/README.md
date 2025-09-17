# Investors Assets

This folder contains all assets used in the investors section of the application.

## Folder Structure

- **`images/`** - General images, charts, graphs, and visual content
- **`icons/`** - Icon files (SVG, PNG) for UI elements
- **`logos/`** - Company logos and brand assets

## Usage Guidelines

### Images
- Use high-quality images optimized for mobile devices
- Recommended formats: PNG, JPG, WebP
- Keep file sizes reasonable for mobile performance

### Icons
- Prefer SVG format for scalability
- Use consistent sizing and styling
- Follow the app's design system

### Logos
- Store company logos in multiple formats if needed
- Maintain aspect ratios and brand guidelines
- Include both light and dark versions when available

## File Naming Convention

Use descriptive, lowercase names with hyphens:
- `company-logo.png`
- `revenue-chart.jpg`
- `growth-icon.svg`

## Integration with React Native

Import assets using relative paths:

```javascript
// For images
import companyLogo from '../assets/logos/company-logo.png';

// Usage in component
<Image source={companyLogo} style={styles.logo} />
```

## Asset Optimization

- Compress images before adding to the project
- Use appropriate resolutions for different screen densities
- Consider using React Native's built-in image optimization features
